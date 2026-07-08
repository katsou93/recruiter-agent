// @ts-nocheck
import { prisma } from "@/lib/prisma";

const TENANT = process.env.VINCERE_TENANT!;
const API_KEY = process.env.VINCERE_API_KEY!;
const CLIENT_ID = process.env.VINCERE_CLIENT_ID!;

async function refreshAccessToken(refreshToken: string) {
      const r = await fetch("https://id.vincere.io/oauth2/token", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                        grant_type: "refresh_token",
                        client_id: CLIENT_ID,
                        refresh_token: refreshToken,
              }),
      });
      if (!r.ok) return null;
      const data = await r.json();
      const newToken = data.id_token || data.access_token;
      if (!newToken) return null;
      const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000);
      await prisma.integration.update({
              where: { provider: "vincere" },
              data: {
                        accessToken: newToken,
                        refreshToken: data.refresh_token || refreshToken,
                        expiresAt,
              },
      });
      return newToken;
}

async function getStoredIntegration() {
      return prisma.integration.findUnique({ where: { provider: "vincere" } });
}

export async function getVincereToken() {
      const integration = await getStoredIntegration();
      if (!integration) return null;
      if (integration.expiresAt && integration.expiresAt.getTime() - Date.now() < 60000) {
              if (integration.refreshToken) {
                        return await refreshAccessToken(integration.refreshToken);
              }
      }
      return integration.accessToken;
}

async function vincereFetch(path: string, options: RequestInit = {}) {
      const token = await getVincereToken();
      if (!token) {
              throw new Error(
                        "Vincere ist nicht verbunden. Bitte einmalig /api/vincere/auth im Browser oeffnen und einloggen."
                      );
      }

  const doFetch = (t: string) =>
          fetch(`https://${TENANT}.vincere.io${path}`, {
                    ...options,
                    headers: {
                                "Content-Type": "application/json",
                                "id-token": t,
                                "x-api-key": API_KEY,
                                ...(options.headers || {}),
                    },
          });

  let res = await doFetch(token);
      if (res.status === 401) {
              const integration = await getStoredIntegration();
              if (integration?.refreshToken) {
                        const newToken = await refreshAccessToken(integration.refreshToken);
                        if (newToken) res = await doFetch(newToken);
              }
      }
      return res;
}

export async function searchVincereCandidates(keyword: string, rows = 10) {
      const res = await vincereFetch(
              `/api/v2/candidate/search/fl=id,name,email,current_job_title,current_employer?keyword=${encodeURIComponent(
                        keyword
                      )}&rows=${rows}`
            );
      if (!res.ok) throw new Error(`Vincere Fehler ${res.status}`);
      const data = await res.json();
      return data.result?.items || [];
}

export async function searchVincereCompanies(keyword: string, rows = 10) {
      const res = await vincereFetch(
              `/api/v2/company/search/fl=id,name,website?keyword=${encodeURIComponent(keyword)}&rows=${rows}`
            );
      if (!res.ok) throw new Error(`Vincere Fehler ${res.status}`);
      const data = await res.json();
      return data.result?.items || [];
}

// Extrahiert "PLZ Ort" aus einer vollen Adresse ("Bahnhofstr. 5, 73630 Remshalden" -> "73630 Remshalden")
function extractPlzOrt(address?: string | null) {
      if (!address) return null;
      const m = address.match(/(\d{5})\s+([A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F\s.\-]{1,40}?)\s*$/);
      if (m) return `${m[1]} ${m[2].trim()}`;
      return null;
}

// Baut den Wert fuer das Vincere-Feld head_quarter (String, z.B. "73630 Remshalden").
// Prioritaet: volle Adresse (z.B. aus dem Impressum via findContact) -> postcode+city -> city
export function buildHeadQuarter(params: { city?: string; postcode?: string; address?: string | null }) {
      const fromAddress = extractPlzOrt(params.address);
      if (fromAddress) return fromAddress;
      const parts = [params.postcode, params.city].filter(Boolean);
      if (parts.length) return parts.join(" ");
      return params.address?.trim() || null;
}

export async function createVincereCompany(params: {
      name: string;
      website?: string;
      city?: string;
      postcode?: string;
      address?: string; // volle Adresse, z.B. "Bahnhofstr. 5, 73630 Remshalden" (aus findContact)
      phone?: string; // Telefon-Zentrale, z.B. aus dem Impressum/Kontakt ermittelt
}) {
      const today = new Date().toISOString().split("T")[0] + "T00:00:00.000Z";
      // FIX: Standort wird jetzt als head_quarter mitgesendet (vorher wurden city/postcode verworfen)
      const headQuarter = buildHeadQuarter(params);
      const normalizedPhone = normalizeGermanPhone(params.phone);
      const payload: Record<string, unknown> = { company_name: params.name, registration_date: today };
      if (headQuarter) payload.head_quarter = headQuarter;
      if (normalizedPhone) payload.phone = normalizedPhone;
      const res = await vincereFetch(`/api/v2/company`, {
              method: "POST",
              body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
              if (data?.errorCode === "DUPLICATED") {
                        const existing = await findVincereCompanyByName(params.name);
                        return { ok: false, duplicated: true, existingId: existing?.id ?? null, message: "Unternehmen existiert bereits in Vincere." };
              }
              throw new Error(`Vincere Fehler ${res.status}: ${JSON.stringify(data)}`);
      }
      const companyId = data.id;
      // FIX: Zusatzfelder per PUT nachziehen. Der Fehler wurde vorher mit .catch(() => {}) STUMM
      // verschluckt - dadurch schien alles "ok", obwohl z.B. der Standort nie ankam. Jetzt wird das
      // Ergebnis (Erfolg oder Fehlermeldung) explizit zurueckgegeben, damit das sichtbar ist.
      const updates: Record<string, unknown> = { registration_date: today, company_name: params.name };
      if (params.website) updates.website = params.website;
      if (headQuarter) updates.head_quarter = headQuarter;
      if (normalizedPhone) updates.phone = normalizedPhone;
      let updateResult: { ok: boolean; error?: string; detail?: unknown } = { ok: true };
      if (companyId && Object.keys(updates).length > 2) {
              try {
                      const updRes = await vincereFetch(`/api/v2/company/${companyId}`, {
                            method: "PUT",
                            body: JSON.stringify(updates),
                      });
                      const updData = await updRes.json().catch(() => ({}));
                      if (!updRes.ok) {
                          updateResult = { ok: false, error: `Vincere Fehler ${updRes.status}`, detail: updData };
                      }
              } catch (e: any) {
                      updateResult = { ok: false, error: e.message };
              }
      }
      return {
              ok: true,
              id: companyId,
              name: data.company_name,
              headQuarter: headQuarter || null,
              phone: normalizedPhone || null,
              headQuarterUpdate: updateResult,
      };
}

// FIX: Vincere braucht die Telefonnummer mit Laendervorwahl. Eine deutsche Nummer, die mit "0"
// beginnt, wird auf "+49 " umgestellt; ist schon eine Vorwahl (+..) vorhanden, bleibt sie unveraendert.
export function normalizeGermanPhone(phone?: string | null) {
      if (!phone) return null;
      const trimmed = phone.trim();
      if (!trimmed) return null;
      if (trimmed.startsWith("+")) return trimmed;
      if (trimmed.startsWith("0")) return "+49 " + trimmed.slice(1).trim();
      return trimmed;
}

// Ergaenzt Standort/Website an einem bestehenden Vincere-Unternehmen (fuer Backfill und Duplikat-Fall)
export async function updateVincereCompany(companyId: number, fields: { headQuarter?: string; website?: string; companyName?: string; phone?: string }) {
      const payload: Record<string, unknown> = {};
      if (fields.headQuarter) payload.head_quarter = fields.headQuarter;
      if (fields.website) payload.website = fields.website;
      const normalizedPhone = normalizeGermanPhone(fields.phone);
      if (normalizedPhone) payload.phone = normalizedPhone;
      if (!Object.keys(payload).length) return { ok: true, skipped: true };
      // FIX: Vincere's PUT /company/{id} verlangt registration_date UND company_name auch bei
      // Teil-Updates (sonst "registration_date cannot be null" bzw. "company_name cannot be blank").
      // company_name wird per Parameter mitgegeben, falls nicht vorhanden per GET nachgeladen.
      const today = new Date().toISOString().split("T")[0] + "T00:00:00.000Z";
      payload.registration_date = today;
      let companyName = fields.companyName;
      if (!companyName) {
              const getRes = await vincereFetch(`/api/v2/company/${companyId}`).catch(() => null);
              if (getRes && getRes.ok) {
                      const getData = await getRes.json().catch(() => ({}));
                      companyName = getData.company_name || getData.name;
              }
      }
      if (companyName) payload.company_name = companyName;
      const res = await vincereFetch(`/api/v2/company/${companyId}`, {
              method: "PUT",
              body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: `Vincere Fehler ${res.status}`, detail: data };
      return { ok: true, id: companyId, updated: Object.keys(payload) };
}

export async function createVincereCandidate(params: {
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      currentTitle?: string;
}) {
      const today = new Date().toISOString().split("T")[0] + "T00:00:00.000Z";
      const payload: Record<string, unknown> = {
              registration_date: today,
              first_name: params.firstName,
              last_name: params.lastName,
      };
      if (params.email) payload.email = params.email;
      if (params.phone) payload.phone = params.phone;
      if (params.currentTitle) payload.job_title = params.currentTitle;

  const res = await vincereFetch(`/api/v2/candidate`, {
          method: "POST",
          body: JSON.stringify(payload),
  });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
              throw new Error(`Vincere Fehler ${res.status}: ${JSON.stringify(data)}`);
      }
      return { ok: true, id: data.id, data };
}

// Listet Unternehmen inkl. head_quarter (fuer den Backfill unvollstaendiger Firmen).
// Hinweis: Falls keyword=* im eigenen Tenant nichts liefert, alternativ q=%2A%3A%2A testen.
export async function listVincereCompanies(start = 0, rows = 100) {
      const res = await vincereFetch(
              `/api/v2/company/search/fl=id,name,website,head_quarter?keyword=*&rows=${rows}&start=${start}`
            );
      if (!res.ok) throw new Error(`Vincere Fehler ${res.status}`);
      const data = await res.json();
      return { items: data.result?.items || [], total: data.result?.total ?? null };
}

export async function findVincereCompanyByName(name: string) {
      const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "").replace(/gmbh|ag|kg|se/g, "");
      const normQ = norm(name);
      const res = await vincereFetch(`/api/v2/company/search/fl=id,name?keyword=${encodeURIComponent(name)}&rows=5`);
      if (!res.ok) return null;
      const data = await res.json();
      const items = data.result?.items || [];
      return (
              items.find((c: any) => {
                        const normC = norm(c.name || "");
                        return normC === normQ || normC.includes(normQ.slice(0, 6)) || normQ.includes(normC.slice(0, 6));
              }) || null
            );
}

export async function createVincereContact(params: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      position?: string;
      companyId?: number;
      companyName?: string;
}) {
      let companyId = params.companyId;
      if (!companyId && params.companyName) {
              const found = await findVincereCompanyByName(params.companyName);
              if (found) companyId = found.id;
      }
      const today = new Date().toISOString().split("T")[0] + "T00:00:00.000Z";
      const payload: Record<string, unknown> = { registration_date: today };
      if (companyId) payload.company_id = companyId;
      let firstName = params.firstName;
      let lastName = params.lastName;
      if (!firstName && !lastName && params.email) {
              firstName = params.email.split("@")[0];
              lastName = "-";
      }
      if (firstName) payload.first_name = firstName;
      if (lastName) payload.last_name = lastName;
      if (params.email) payload.email = params.email;
      if (params.phone) payload.phone = params.phone;
      if (params.position) payload.job_title = params.position;

  if (!payload.first_name && !payload.email) {
          return { ok: false, error: "Keine Kontaktdaten vorhanden" };
  }

  const searchQuery = params.email || `${firstName || ""} ${lastName || ""}`.trim();
      if (searchQuery) {
              const checkRes = await vincereFetch(
                        `/api/v2/contact/search/fl=id,email,first_name,last_name?keyword=${encodeURIComponent(searchQuery)}&rows=5`
                      );
              if (checkRes.ok) {
                        const checkData = await checkRes.json().catch(() => ({}));
                        const existing = (checkData.result?.items || []).find((c: any) => {
                                    if (params.email && c.email === params.email) return true;
                                    if (firstName && lastName) {
                                                  const fullName = `${c.first_name || ""} ${c.last_name || ""}`.toLowerCase().trim();
                                                  if (fullName === `${firstName} ${lastName}`.toLowerCase().trim()) return true;
                                    }
                                    return false;
                        });
                        if (existing) return { ok: true, id: existing.id, existing: true };
              }
      }

  const res = await vincereFetch(`/api/v2/contact`, {
          method: "POST",
          body: JSON.stringify(payload),
  });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
              return { ok: false, error: `Vincere Fehler ${res.status}`, detail: data };
      }
      return { ok: true, id: data.id || data.contact_id || null, data };
}
