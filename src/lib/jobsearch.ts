// @ts-nocheck
// Bundesagentur fuer Arbeit - oeffentliche Jobsuche-API (aggregiert Stellen von vielen Portalen)
const BA_CLIENT_ID = "c003a37f-024f-462a-b36d-b001be4cd24a";
const BA_CLIENT_SECRET = "32a39620-32b3-4307-9aa1-511e3d7f48a8";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36";

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
  if (!r) return [];
  const data = await r.json();
  const items = data.stellenangebote || [];
  return items.map((j) => ({
    source: "arbeitsagentur",
    refnr: j.refnr,
    title: j.titel,
    company: j.arbeitgeber,
    location: [j.arbeitsort?.plz, j.arbeitsort?.ort].filter(Boolean).join(" "),
    distanceKm: j.arbeitsort?.entfernung ?? null,
    publishedAt: j.aktuelleVeroeffentlichungsdatum,
    url: "https://www.arbeitsagentur.de/jobsuche/jobdetail/" + encodeURIComponent(j.refnr || ""),
  }));
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

async function fetchHtml(url, timeout = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "de-DE,de;q=0.9",
      },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!r.ok) return null;
    return await r.text();
  } catch {
    clearTimeout(t);
    return null;
  }
}

// StepStone - parst JSON-LD JobPosting Eintraege aus der Suchergebnisseite
export async function searchJobsStepStone(was, wo, radius) {
  try {
    const slug = encodeURIComponent(was.trim().toLowerCase().replace(/\s+/g, "-"));
    const loc = encodeURIComponent(wo.trim());
    const url = `https://www.stepstone.de/jobs/${slug}/in-${loc}?radius=${radius ?? 50}`;
    const html = await fetchHtml(url);
    if (!html) return [];
    const jobs = [];
    const scriptRe = /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
    let m;
    while ((m = scriptRe.exec(html)) !== null) {
      try {
        const json = JSON.parse(m[1]);
        const arr = Array.isArray(json) ? json : [json];
        for (const entry of arr) {
          if (entry && entry["@type"] === "JobPosting") {
            jobs.push({
              source: "stepstone",
              refnr: null,
              title: entry.title || null,
              company: entry.hiringOrganization?.name || null,
              location:
                entry.jobLocation?.address?.addressLocality ||
                entry.jobLocation?.[0]?.address?.addressLocality ||
                wo,
              distanceKm: null,
              publishedAt: entry.datePosted || null,
              url: entry.url || url,
            });
          }
        }
      } catch (_) {}
    }
    return jobs;
  } catch {
    return [];
  }
}

// Indeed - parst das eingebettete Suchergebnis-JSON aus der Seite
export async function searchJobsIndeed(was, wo, radius) {
  try {
    const q = encodeURIComponent(was);
    const l = encodeURIComponent(wo);
    const url = `https://de.indeed.com/jobs?q=${q}&l=${l}&radius=${radius ?? 50}`;
    const html = await fetchHtml(url);
    if (!html) return [];
    const jobs = [];
    const m = html.match(/window\.mosaic\.providerData\["mosaic-provider-jobcards"\]\s*=\s*(\{[\s\S]*?\});/);
    if (m) {
      try {
        const json = JSON.parse(m[1]);
        const results = json?.metaData?.mosaicProviderJobCardsModel?.results || [];
        for (const r of results) {
          jobs.push({
            source: "indeed",
            refnr: null,
            title: r.title || r.displayTitle || null,
            company: r.company || r.truncatedCompany || null,
            location: r.formattedLocation || r.jobLocationCity || wo,
            distanceKm: null,
            publishedAt: null,
            url: r.jobkey ? `https://de.indeed.com/viewjob?jk=${r.jobkey}` : url,
          });
        }
      } catch (_) {}
    }
    if (!jobs.length) {
      const scriptRe = /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
      let sm;
      while ((sm = scriptRe.exec(html)) !== null) {
        try {
          const json = JSON.parse(sm[1]);
          const arr = Array.isArray(json) ? json : [json];
          for (const entry of arr) {
            if (entry && entry["@type"] === "JobPosting") {
              jobs.push({
                source: "indeed",
                refnr: null,
                title: entry.title || null,
                company: entry.hiringOrganization?.name || null,
                location: entry.jobLocation?.address?.addressLocality || wo,
                distanceKm: null,
                publishedAt: entry.datePosted || null,
                url: entry.url || url,
              });
            }
          }
        } catch (_) {}
      }
    }
    return jobs;
  } catch {
    return [];
  }
}

// Durchsucht Arbeitsagentur + StepStone + Indeed parallel und fasst die Ergebnisse zusammen
export async function searchAllJobs(params) {
  const { was, wo, umkreis, size } = params;
  const [ba, stepstone, indeed] = await Promise.all([
    searchJobsBA({ was, wo, umkreis, size }).catch(() => []),
    searchJobsStepStone(was, wo, umkreis).catch(() => []),
    searchJobsIndeed(was, wo, umkreis).catch(() => []),
  ]);

  const all = [...ba, ...stepstone, ...indeed];
  const seen = new Set();
  const deduped = [];
  for (const j of all) {
    const key = `${(j.title || "").toLowerCase().trim()}|${(j.company || "").toLowerCase().trim()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(j);
  }

  return {
    total: deduped.length,
    bySource: { arbeitsagentur: ba.length, stepstone: stepstone.length, indeed: indeed.length },
    jobs: deduped,
  };
}
