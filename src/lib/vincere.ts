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

export async function createVincereCompany(params: {
    name: string;
    website?: string;
    city?: string;
    postcode?: string;
}) {
    const today = new Date().toISOString().split("T")[0] + "T00:00:00.000Z";
    const res = await vincereFetch(`/api/v2/company`, {
          method: "POST",
          body: JSON.stringify({ company_name: params.name, registration_date: today }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
          if (data?.errorCode === "DUPLICATED") {
                  return { ok: false, duplicated: true, message: "Unternehmen existiert bereits in Vincere." };
          }
          throw new Error(`Vincere Fehler ${res.status}: ${JSON.stringify(data)}`);
    }
    const companyId = data.id;
    if (params.website && companyId) {
          await vincereFetch(`/api/v2/company/${companyId}`, {
                  method: "PUT",
                  body: JSON.stringify({ website: params.website }),
          }).catch(() => {});
    }
    return { ok: true, id: companyId, name: data.company_name };
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
