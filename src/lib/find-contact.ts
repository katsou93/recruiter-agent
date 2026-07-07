// @ts-nocheck
// find-contact.ts - findet automatisch Ansprechpartner (HR/Geschaeftsfuehrung) fuer ein Unternehmen
// Portiert aus portalhub find-contact.js v9
// Priority: 1)jobText 2)externeUrl 3)Website HR 4)Impressum CEO 5)Email 6)constructed
const AE = "\u00e4", OE = "\u00f6", UE = "\u00fc", SS = "\u00df", AEU = "\u00c4", OEU = "\u00d6", UEU = "\u00dc";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36";
function normCompany(n) { return n.toLowerCase().replace(/\bgmbh\s*&\s*co\.?\s*kg\b|\bgmbh\b|\bag\b|\bse\b|\bkg\b|\bug\b|\bgrp\b|\bgroup\b|\bholding\b/gi, "").replace(/niederlassung\s+\w+/gi, "").replace(new RegExp(AE, "g"), "ae").replace(new RegExp(OE, "g"), "oe").replace(new RegExp(UE, "g"), "ue").replace(new RegExp(SS, "g"), "ss").replace(/\s*&\s*/g, "und").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, "-").replace(/^-+|-+$/g, ""); }
function cap(s) { return s ? s.trim().split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ") : ""; }
function stripHtml(h) { return h.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim(); }
const HR_EMAIL = /(?:bewerbung|hr|personal|karriere|recruiting|jobs|talent|bewerb|people|kultur)@/i;
const SKIP_EMAIL = /^(noreply|no-reply|donotreply|bounce|mailer-daemon|postmaster|dsgvo|datenschutz|verwaltung)@/i;
const GENERIC = /^(info|kontakt|post|mail|office|hallo|hello|support|service|sales|vertrieb|anfrage|sekretariat|team|web)@/i;
function bestEmail(text) { const all = [...text.matchAll(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g)].map((m) => m[0]).filter((e) => !SKIP_EMAIL.test(e)); if (!all.length) return null; const de = all.filter((e) => e.endsWith(".de")); const pool = de.length ? de : all; return pool.find((e) => HR_EMAIL.test(e)) || pool.find((e) => !GENERIC.test(e)) || pool[0]; }
function upgradeEmail(cur, cand) { if (!cand) return cur; if (!cur) return cand; if (cand.endsWith(".de") && !cur.endsWith(".de")) return cand; if (HR_EMAIL.test(cand) && !HR_EMAIL.test(cur)) return cand; if (!GENERIC.test(cand) && GENERIC.test(cur)) return cand; return cur; }
function bestPhone(text) { const m1 = text.match(/(?:Tel(?:efon|\.)?|Fon|Phone|Mobil)[\s.:]*([+\d][\d\s()\-\/]{7,18})/i); if (m1) return m1[1].trim().replace(/\s+/g, " "); const m2 = text.match(/(?:^|\s)((?:\+49|0)[\d\s()\-\/]{8,18})(?:\s|$)/m); if (m2) return m2[1].trim().replace(/\s+/g, " "); return null; }
function extractAddress(t) { const re = new RegExp("([A-Z" + AEU + OEU + UEU + UE + AE + OE + "][a-zA-Z" + AE + OE + UE + AEU + OEU + UEU + SS + "\\-\\.\\s]{3,40}\\s+\\d{1,4}[a-zA-Z]?),?\\s+(\\d{5})\\s+([A-Z" + AEU + OEU + UEU + "][a-zA-Z" + AE + OE + UE + AEU + OEU + UEU + SS + "\\-\\s]{2,30}?)(?=[\\s\\n\\r,;]|$)", "i"); const m = t.match(re); if (!m) return null; let street = m[1].replace(/^.*?(?:GmbH|Co\.\s*KG|KG)\s+/i, "").trim(); if (street.length < 3) street = m[1].trim(); return street + ", " + m[2] + " " + m[3].trim(); }
// Zieht den offiziellen (rechtlichen) Firmennamen aus dem Impressum, z.B. "Mueller Technik GmbH & Co. KG"
function extractOfficialName(t) { const legal = "(?:GmbH\\s*&\\s*Co\\.?\\s*KG|GmbH|AG\\s*&\\s*Co\\.?\\s*KG|KGaA|AG|UG\\s*\\(haftungsbeschr" + AE + "nkt\\)|UG|SE|OHG|eG|e\\.V\\.)"; const re = new RegExp("([A-Z" + AEU + OEU + UEU + "][A-Za-z0-9" + AE + OE + UE + AEU + OEU + UEU + SS + "&.\\-\\s]{1,60}?\\s" + legal + ")"); const m = t.match(re); if (!m) return null; return m[1].replace(/\s+/g, " ").trim(); }
const BL = new Set(["Engineering", "Software", "Solutions", "Systems", "Services", "Technologies", "Consulting", "Business", "International", "Industrial", "Technical", "Digital", "Applications", "Products", "Operations", "Innovation", "Automation", "Division", "Manufacturing", "Mechanical", "Electrical", "Electronic", "Management", "Development", "Research", "Design", "Quality", "Production", "Gmbh", "Gruppe", "Group", "Holding", "Corporate", "Kontakt", "Karriere", "Bewerbung", "Impressum", "Datenschutz", "Stellenangebote", "Leistungen", "Produkte", "Unternehmen", "Standorte", "Aktuelles", "Presse", "Berufsfelder", "Berufe", "Bewerbende", "Bewerber", "Vorteile", "Leistung", "Infos", "Informationen", "Jobs", "Head", "People", "Culture", "Kultur", "Ihre", "Unser", "Unsere", "Ihren", "Ihrem", "Ihrer", "Unseren", "Unserem", "Unserer", "Seine", "Sein", "Dein", "Deine"]);
function isRealName(fn, ln) { const fc = fn.replace(/^(Dr\.|Prof\.|Dipl\.|Ing\.)\s*/i, "").trim(); if (fc.length < 2 || ln.length < 2) return false; if (BL.has(fc) || BL.has(ln)) return false; if (/^[A-Z]{1,3}$/.test(fc) || /^[A-Z]{1,3}$/.test(ln)) return false; const startRe = new RegExp("^[A-Z" + AEU + OEU + UEU + "]"); if (!startRe.test(fc) || !startRe.test(ln)) return false; if (/\d/.test(fc) || /\d/.test(ln)) return false; if (fc.length > 25 || ln.length > 40) return false; const dashLower = new RegExp("-[a-z" + AE + OE + UE + SS + "]"); if (dashLower.test(ln)) return false; return true; }
function getHRPos(c) { const t = (c || "").toLowerCase(); if (t.includes("personalleiter")) return "Personalleiter/in"; if (t.includes("people") || t.includes("culture")) return "People & Culture"; if (t.includes("personal") || t.includes("human resources")) return "HR Manager/in"; if (t.includes("recruit")) return "Recruiter/in"; if (t.includes("talent")) return "Talent Acquisition"; return "HR Ansprechpartner/in"; }
const NAME_CHARS = "a-zA-Z" + AE + OE + UE + AEU + OEU + UEU + SS + "\\-";
function extractCEO(rawHtml) { const m1re = new RegExp("[Vv]ertreten\\s+durch[\\s:\\n]+(?:Dr\\.|Prof\\.|Dipl\\.[-\\w]*\\.?\\s+)?([A-Z][" + NAME_CHARS + "]{1,20})\\s+(?:[A-Z]\\.\\s+)?([A-Z][" + NAME_CHARS + "]{1,30})", "m"); const m1 = rawHtml.match(m1re); if (m1 && m1[1] && m1[2]) { const fn = cap(m1[1]), ln = cap(m1[2]); if (isRealName(fn, ln)) return { firstName: fn, lastName: ln, position: "Gesch" + AE + "ftsf" + UE + "hrer/in" }; } const t = stripHtml(rawHtml); const geschTitle = "Gesch" + AE + "ftsf" + UE + "hrer"; const pats = [new RegExp("(?:" + geschTitle + "(?:in)?|Inhaber(?:in)?|Vorstand|CEO)[:\\s]+(?:(?:Dr|Prof|Dipl)\\.[-\\s\\w]*\\.?\\s+)?([A-Z" + AEU + OEU + UEU + "][" + NAME_CHARS + "]{1,20})\\s+(?:[A-Z]\\.\\s+)?([A-Z" + AEU + OEU + UEU + "][" + NAME_CHARS + "]{1,30})"), new RegExp("([A-Z" + AEU + OEU + UEU + "][" + NAME_CHARS + "]{1,20})\\s+(?:[A-Z]\\.\\s+)?([A-Z" + AEU + OEU + UEU + "][" + NAME_CHARS + "]{1,30})[,\\s]+(?:" + geschTitle + "|Inhaber|CEO|Vorstand)"), new RegExp("[Vv]ertreten\\s+durch[:\\s]+(?:(?:Dr|Prof|Dipl)\\.[-\\s\\w]*\\.?\\s+)?([A-Z" + AEU + OEU + UEU + "][" + NAME_CHARS + "]{1,20})\\s+(?:[A-Z]\\.\\s+)?([A-Z" + AEU + OEU + UEU + "][" + NAME_CHARS + "]{1,30})")]; for (const p of pats) { const m = t.match(p); if (m && m[1] && m[2]) { const fn = cap(m[1]), ln = cap(m[2]); if (isRealName(fn, ln)) return { firstName: fn, lastName: ln, position: "Gesch" + AE + "ftsf" + UE + "hrer/in" }; } } return null; }
function extractHR(text, rawHtml) { const frauHerrRe = new RegExp("(?:bei\\s+)?(?:Frau|Herr)\\s+(?:(?:Dr|Prof)\\.\\s+)?([A-Z" + AEU + OEU + UEU + "][a-zA-Z" + AE + OE + UE + AEU + OEU + UEU + SS + "]{2,20})\\s+([A-Z" + AEU + OEU + UEU + "][" + NAME_CHARS + "]{2,40})"); const frauHerr = text.match(frauHerrRe); if (frauHerr && frauHerr[1] && frauHerr[2]) { const fn = cap(frauHerr[1]), ln = frauHerr[2]; if (isRealName(fn, ln.charAt(0).toUpperCase() + ln.slice(1))) { const idx = text.indexOf(frauHerr[0]); const ctx = text.slice(Math.max(0, idx - 50), idx + 300); const ctxEmail = ctx.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/); return { firstName: fn, lastName: ln, position: getHRPos(ctx), _email: ctxEmail ? ctxEmail[0] : null }; } } const pats = [new RegExp("(?:Ansprechpartner(?:person|in)?|Personalreferent(?:in)?|Recruiter(?:in)?)\\s*[:\\s]+(?:(?:Dr|Prof)\\.\\s+)?([A-Z" + AEU + OEU + UEU + "][a-zA-Z" + AE + OE + UE + AEU + OEU + UEU + SS + "]{2,20})\\s+([A-Z" + AEU + OEU + UEU + "][" + NAME_CHARS + "]{2,40})"), new RegExp("([A-Z" + AEU + OEU + UEU + "][a-zA-Z" + AE + OE + UE + AEU + OEU + UEU + SS + "]{2,20})\\s+([A-Z" + AEU + OEU + UEU + "][" + NAME_CHARS + "]{2,40})[,\\-\\s]+(?:Personal(?:leiterin?|referentin?)?|HR[-\\s]?Manager(?:in)?|Recruit(?:er(?:in)?|ing)|Talent\\s+Acquisition|People.{0,15}Culture)")]; for (const p of pats) { const m = text.match(p); if (m && m[1] && m[2]) { const fn = cap(m[1]), ln = m[2]; if (isRealName(fn, ln.charAt(0).toUpperCase() + ln.slice(1))) return { firstName: fn, lastName: ln, position: getHRPos(m[0]) }; } } if (rawHtml) { for (const mb of rawHtml.matchAll(/href="mailto:([^"]+)"/gi)) { const mailIdx = rawHtml.indexOf(mb[0]); const before = stripHtml(rawHtml.slice(Math.max(0, mailIdx - 400), mailIdx)); const nmRe1 = new RegExp("(?:Frau|Herr)\\s+([A-Z" + AEU + OEU + UEU + "][a-zA-Z" + AE + OE + UE + AEU + OEU + UEU + SS + "]{2,20})\\s+([A-Z" + AEU + OEU + UEU + "][" + NAME_CHARS + "]{2,40})", "i"); const nmRe2 = new RegExp("([A-Z" + AEU + OEU + UEU + "][a-zA-Z" + AE + OE + UE + AEU + OEU + UEU + SS + "]{2,20})\\s+([A-Z" + AEU + OEU + UEU + "][" + NAME_CHARS + "]{2,40})\\s*(?:Head|Personal|HR|Recruit|Talent|People|Manager|Leiterin?)", "i"); const nm = before.match(nmRe1) || before.match(nmRe2); if (nm && nm[1] && nm[2]) { const fn = cap(nm[1]), ln = nm[2]; if (isRealName(fn, ln.charAt(0).toUpperCase() + ln.slice(1))) return { firstName: fn, lastName: ln, position: getHRPos(before), _email: mb[1] }; } } } return null; }
async function findWebsiteViaGoogle(companyName, city) { try { const q = encodeURIComponent('"' + companyName + '" ' + (city || "") + " Impressum"); const r = await fetch("https://www.google.de/search?q=" + q + "&num=8&hl=de&gl=de", { headers: { "User-Agent": UA, Accept: "text/html", "Accept-Language": "de-DE,de;q=0.9" }, signal: (() => { const c = new AbortController(); setTimeout(() => c.abort(), 5000); return c.signal; })(), redirect: "follow" }); if (!r.ok) return null; const html = await r.text(); const norm = normCompany(companyName); const words = norm.split("-").filter((w) => w.length > 2); const scored = []; for (const m of html.matchAll(/href="(https?:\/\/(?!(?:www\.)?google)[^"&]{10,}?)(?:[&"])/g)) { try { const u = new URL(m[1]); const host = u.hostname.replace(/^www\./, ""); const hn = host.replace(/[.\-]/g, ""); const isDe = host.endsWith(".de"); if (words.some((w) => w.length > 3 && hn.includes(w))) scored.push({ url: "https://" + u.hostname, score: isDe ? 2 : 1 }); } catch (_) {} } scored.sort((a, b) => b.score - a.score); return scored.length ? scored[0].url : null; } catch { return null; } }
async function findWebsiteByProbing(companyName, city) { const norm = normCompany(companyName); const words = norm.split("-").filter((w) => w.length > 0); if (!words.length) return null; const slugs = new Set(); slugs.add(words.slice(0, 4).join("-")); if (words.length > 2) slugs.add(words.slice(0, 3).join("-")); if (words.length > 1) slugs.add(words.slice(0, 2).join("-")); slugs.add(words[0]); const orig = companyName.toLowerCase().replace(/\s+gmbh.*$/i, "").replace(/\s+ag.*$/i, "").replace(/\s+kg.*$/i, "").replace(/\s*&\s*/g, "und").replace(/\s+/g, "-").replace(new RegExp("[^a-z0-9" + AE + OE + UE + SS + "\\-]", "g"), ""); if (orig.length > 2) slugs.add(orig); const probes = []; for (const s of slugs) { probes.push("https://www." + s + ".de"); probes.push("https://" + s + ".de"); probes.push("https://www." + s + ".com"); } const validate = async (url) => { const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 3000); try { const r = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow", signal: ctrl.signal }); clearTimeout(t); if (!r.ok) return null; const txt = (await r.text()).toLowerCase(); const fh = new URL(r.url || url).hostname; const kws = norm.split("-").filter((w) => w.length > 3); if (kws.length > 0 && !kws.some((k) => txt.includes(k))) { const tm = txt.match(/<title[^>]*>([^<]{0,100})<\/title>/i); if (!tm || !kws.some((k) => tm[1].includes(k))) return null; } return { url: "https://" + fh, isDe: fh.endsWith(".de") }; } catch { clearTimeout(t); return null; } }; const results = (await Promise.all([...new Set(probes)].map(validate))).filter(Boolean); const de = results.find((r) => r.isDe); return de ? de.url : results[0]?.url || null; }
async function findWebsite(n, c) { const [g, p] = await Promise.all([findWebsiteViaGoogle(n, c), findWebsiteByProbing(n, c)]); const cands = [g, p].filter(Boolean); return cands.find((x) => x.endsWith(".de")) || cands[0] || null; }
async function fetchPage(url, timeout = 6000) { const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), timeout); try { const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html", "Accept-Language": "de-DE,de;q=0.9" }, redirect: "follow", signal: ctrl.signal }); clearTimeout(t); if (!r.ok) return null; const html = await r.text(); return { url: r.url || url, text: stripHtml(html), html }; } catch { clearTimeout(t); return null; } }
// Eigenstaendige Adress-Ermittlung: zieht die Firmenadresse direkt aus dem Impressum
// (Fallback: Kontakt-/Startseite) - unabhaengig davon, ob ein Ansprechpartner gefunden wird.
async function fetchImpressumData(base) { if (!base) return { address: null, officialName: null }; const urls = [base + "/impressum", base + "/de/impressum", base + "/legal/impressum", base + "/rechtliches", base + "/kontakt", base]; const results = await Promise.all(urls.map((u) => fetchPage(u))); let address = null, officialName = null; for (const r of results) { if (!r) continue; if (!address) address = extractAddress(r.text); if (!officialName) officialName = extractOfficialName(r.text); if (address && officialName) break; } return { address, officialName }; }

export async function findContact(params) {
    const { name, city, website, jobText, externeUrl } = params;
    const empty = { firstName: null, lastName: null, email: null, phone: null, position: null, source: null, website: null, address: null, officialName: null };
    if (!name) return { ...empty, source: "error_no_name" };

  let base = website ? (website.startsWith("http") ? website.replace(/\/+$/, "") : "https://" + website) : null;

  // FIX: Adresse UND offizieller Firmenname (aus dem Impressum) sind eigenstaendige, IMMER
  // laufende Schritte (Top-Level-Felder "address" und "officialName"). Der Job-Board-Name kann
  // vom rechtlichen Namen abweichen; officialName wird fuer den Vincere-Abgleich benutzt.
  let address = jobText ? extractAddress(jobText) : null;
  let officialName = null;
  const withAddress = async (result) => {
        if (!address || !officialName) {
              if (!base) base = await findWebsite(name, city);
              if (base) {
                    const impData = await fetchImpressumData(base);
                    if (!address) address = impData.address;
                    if (!officialName) officialName = impData.officialName;
              }
        }
        return { ...result, address: result.address || address || null, officialName: officialName || null, website: result.website || base || null };
  };

  if (jobText) {
        const hr = extractHR(jobText, null);
        if (hr) return withAddress({ ...hr, email: hr._email || bestEmail(jobText), phone: bestPhone(jobText), source: "jobtext", website: base });
        const em = bestEmail(jobText);
        if (em && HR_EMAIL.test(em)) return withAddress({ ...empty, firstName: "Bewerbung", lastName: name.split(" ")[0], email: em, phone: bestPhone(jobText), position: "HR Bewerbungskontakt", source: "jobtext_email", website: base });
  }

  let extUrl = externeUrl || null;
    if (extUrl) {
          const ep = await fetchPage(extUrl);
          if (ep) {
                  if (!address) address = extractAddress(ep.text);
                  if (!officialName) officialName = extractOfficialName(ep.text);
                  const hr = extractHR(ep.text, ep.html);
                  if (hr) return withAddress({ ...hr, email: hr._email || bestEmail(ep.text), phone: bestPhone(ep.text), source: "externe_url", website: base });
                  const mm = ep.html?.match(/href="mailto:([^"]+)"/i);
                  if (mm) return withAddress({ ...empty, email: mm[1], position: "HR Bewerbungskontakt", source: "externe_url_mailto", website: base });
          }
    }

  if (!base) base = await findWebsite(name, city);
    if (!base) return { ...empty, address: address || null, officialName: officialName || null, source: "no_website" };

  const pages = [
    { url: base + "/karriere", type: "career" },
    { url: base + "/jobs", type: "career" },
    { url: base + "/stellenangebote", type: "career" },
    { url: base + "/career", type: "career" },
    { url: base + "/kontakt", type: "contact" },
    { url: base + "/team", type: "about" },
    { url: base + "/ueber-uns", type: "about" },
    { url: base, type: "home" },
    { url: base + "/impressum", type: "impressum" },
    { url: base + "/de/impressum", type: "impressum" },
    { url: base + "/legal/impressum", type: "impressum" },
    { url: base + "/rechtliches", type: "impressum" },
        ...(extUrl ? [{ url: extUrl, type: "extern" }] : []),
      ];
    const results = await Promise.all(pages.map((p) => fetchPage(p.url).then((r) => (r ? { ...p, ...r } : null))));

  let bestEmailFound = null, bestPhoneFound = null, hrContact = null, ceoContact = null;
    for (const page of results) {
          if (!page) continue;
          const em = bestEmail(page.text);
          const ph = bestPhone(page.text);
          bestEmailFound = upgradeEmail(bestEmailFound, em);
          if (ph && !bestPhoneFound) bestPhoneFound = ph;
          // FIX: Adresse UND offizieller Name aus JEDER Impressum-Seite ziehen - unabhaengig
          // davon, ob ein CEO gefunden wird
          if (page.type === "impressum") {
                  if (!address) address = extractAddress(page.text);
                  if (!officialName) officialName = extractOfficialName(page.text);
          }
          if (!hrContact && page.type !== "impressum") {
                  const hr = extractHR(page.text, page.html);
                  if (hr) hrContact = { ...hr, email: hr._email || em || null, phone: ph || null, source: "website_" + page.type, website: base };
          }
          if (!ceoContact && page.type === "impressum") {
                  const ceo = extractCEO(page.html || page.text);
                  if (ceo) ceoContact = { ...ceo, email: em || null, phone: ph || null, source: "impressum_ceo", website: base };
          }
    }
    // Fallback: Adresse von Kontakt-/Team-/Startseite, falls das Impressum nichts liefert
    if (!address) { for (const page of results) { if (!page) continue; const a = extractAddress(page.text); if (a) { address = a; break; } } }
    if (!officialName) { for (const page of results) { if (!page) continue; const o = extractOfficialName(page.text); if (o) { officialName = o; break; } } }

  if (hrContact) return { ...hrContact, address: address || null, officialName: officialName || null };
    if (ceoContact) return { ...ceoContact, address: address || null, officialName: officialName || null };
    if (bestEmailFound) {
          const isHR = HR_EMAIL.test(bestEmailFound);
          return { ...empty, firstName: isHR ? "Bewerbung" : "Personalabteilung", lastName: name.split(/\s+/)[0], email: bestEmailFound, phone: bestPhoneFound, position: isHR ? "HR Bewerbungskontakt" : "Ansprechpartner/in", source: "email_fallback", website: base, address: address || null, officialName: officialName || null };
    }
    try {
          const domain = new URL(base).hostname.replace(/^www\./, "");
          return { ...empty, firstName: "Bewerbung", lastName: name.split(/\s+/)[0], email: "bewerbung@" + domain, position: "HR Bewerbungskontakt", source: "constructed_email", website: base, address: address || null, officialName: officialName || null };
    } catch (_) {}
    return { ...empty, website: base, address: address || null, officialName: officialName || null, source: "no_contact_found" };
}
