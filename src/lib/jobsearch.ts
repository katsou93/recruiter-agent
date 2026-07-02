ö// @ts-nocheck
// Bundesagentur fuer Arbeit - oeffentliche Jobsuche-API (aggregiert Stellen von vielen Portalen)
const BA_CLIENT_ID = "c003a37f-024f-462a-b36d-b001be4cd24a";
const BA_CLIENT_SECRET = "32a39620-32b3-4307-9aa1-511e3d7f48a8";

async function getBAToken() {
    try {
          const r = await fetch("https://rest.arbeitsagentur.de/oauth/gettoken_cc", {
                  method: "POST",
                  headers: { "Content-Type": "application/x-www-form-urlencoded" },
                  body: `client_id=${BA_CLIENT_ID}&client_secret=${BA_CLIENT_SECRET}&grant_type=client_credentials`,
          });
          if (!r.ok) return null;
          const d = await r.json();
          return d.access_token || null;
    } catch {
          return null;
    }
}

function baHeaders(token) {
    return token
      ? { Authorization: "Bearer " + token, Accept: "application/json" }
          : { "X-API-Key": "jobboerse-jobsuche", "User-Agent": "RecruiterAgent/1.0", Accept: "application/json" };
}

async function fetchBAWithFallback(url) {
    let r = await fetch(url, { headers: baHeaders(null) }).catch(() => null);
    if (r && r.ok) return r;
    const token = await getBAToken();
    if (!token) return null;
    r = await fetch(url, { headers: baHeaders(token) }).catch(() => null);
    return r && r.ok ? r : null;
}

export async function searchJobsBA(params) {
    const q = new URLSearchParams();
    q.set("was", params.was);
    q.set("wo", params.wo);
    q.set("umkreis", String(params.umkreis ?? 50));
    q.set("size", String(params.size ?? 25));
    q.set("page", String(params.page ?? 1));

  const url = "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs?" + q.toString();
    const r = await fetchBAWithFallback(url);
    if (!r) return { jobs: [], total: 0, error: "BA API nicht erreichbar" };
    const data = await r.json();
    const items = data.stellenangebote || [];
    return {
          total: data.maxErgebnisse || items.length,
          jobs: items.map((j) => ({
                  refnr: j.refnr,
                  title: j.titel,
                  company: j.arbeitgeber,
                  location: [j.arbeitsort?.plz, j.arbeitsort?.ort].filter(Boolean).join(" "),
                  distanceKm: j.arbeitsort?.entfernung ?? null,
                  publishedAt: j.aktuelleVeroeffentlichungsdatum,
          })),
    };
}

export async function getJobDetailBA(refnr) {
    const detailUrl =
          "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobdetails/" + encodeURIComponent(refnr);
    const r = await fetchBAWithFallback(detailUrl);
    let apiData = null;
    if (r) {
          const d = await r.json().catch(() => ({}));
          apiData = d.stellenangebot || d;
    }
    return {
          title: apiData?.titel || null,
          company: apiData?.arbeitgeber || null,
          location: apiData?.arbeitsort || null,
          description: apiData?.stellenbeschreibung || null,
          externalUrl:
                  apiData?.externeUrl || apiData?.externalJobUrl || apiData?.externalUrl || apiData?.bewerbungUrl || null,
          employerHomepage: apiData?.arbeitgeberHomepage || null,
          contact: apiData?.kontaktAngaben || null,
    };
}
