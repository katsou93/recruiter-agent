// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck - Prisma types are generated at build time; this file is type-safe at runtime
import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const saveCandidateTool = tool({
  description:
    "Speichert einen neuen Kandidaten in der Datenbank.",
  inputSchema: z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().optional(),
    phone: z.string().optional(),
    linkedinUrl: z.string().optional(),
    xingUrl: z.string().optional(),
    currentTitle: z.string().optional(),
    currentCompany: z.string().optional(),
    location: z.string().optional(),
    skills: z.array(z.string()).optional(),
    notes: z.string().optional(),
    source: z.string().optional(),
    salary: z.string().optional(),
    availability: z.string().optional(),
  }),
  execute: async (params) => {
    const candidate = await prisma.candidate.create({
      data: { ...params, skills: params.skills ?? [] },
    });
    return {
      success: true,
      candidateId: candidate.id,
      message: `Kandidat ${candidate.firstName} ${candidate.lastName} gespeichert.`,
    };
  },
});

export const searchCandidatesTool = tool({
  description: "Sucht in der internen Datenbank nach Kandidaten.",
  inputSchema: z.object({
    query: z.string().optional(),
    skills: z.array(z.string()).optional(),
    location: z.string().optional(),
    status: z
      .enum(["NEW", "CONTACTED", "REPLIED", "INTERVIEW", "OFFER", "PLACED", "REJECTED", "INACTIVE"])
      .optional(),
    limit: z.number().optional().default(10),
  }),
  execute: async ({ query, skills, location, status, limit }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (status) where.status = status;
    if (location) where.location = { contains: location, mode: "insensitive" };
    if (skills && skills.length > 0) where.skills = { hasSome: skills };
    if (query) {
      where.OR = [
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
        { currentTitle: { contains: query, mode: "insensitive" } },
        { currentCompany: { contains: query, mode: "insensitive" } },
      ];
    }
    const candidates = await prisma.candidate.findMany({
      where,
      take: limit,
      orderBy: { createdAt: "desc" },
    });
    return {
      count: candidates.length,
      candidates: candidates.map((c) => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        email: c.email,
        title: c.currentTitle,
        company: c.currentCompany,
        location: c.location,
        skills: c.skills,
        status: c.status,
      })),
    };
  },
});

export const updateCandidateStatusTool = tool({
  description: "Aktualisiert den Pipeline-Status eines Kandidaten.",
  inputSchema: z.object({
    candidateId: z.string(),
    status: z.enum(["NEW", "CONTACTED", "REPLIED", "INTERVIEW", "OFFER", "PLACED", "REJECTED", "INACTIVE"]),
    notes: z.string().optional(),
  }),
  execute: async ({ candidateId, status, notes }) => {
    const candidate = await prisma.candidate.update({
      where: { id: candidateId },
      data: { status, ...(notes ? { notes } : {}) },
    });
    return {
      success: true,
      message: `Status von ${candidate.firstName} ${candidate.lastName} auf ${status} gesetzt.`,
    };
  },
});

export const draftOutreachTool = tool({
  description: "Erstellt einen Anschreiben-Entwurf fuer einen Kandidaten (wird als Entwurf gespeichert, nicht versendet).",
  inputSchema: z.object({
    candidateId: z.string(),
    jobId: z.string().optional(),
    subject: z.string(),
    body: z.string(),
  }),
  execute: async ({ candidateId, jobId, subject, body }) => {
    const outreach = await prisma.outreach.create({
      data: { candidateId, jobId: jobId ?? null, subject, body, status: "DRAFT" },
    });
    return {
      success: true,
      outreachId: outreach.id,
      message: "Entwurf gespeichert. Du versendest ihn manuell ueber Outlook.",
    };
  },
});

export const saveCompanyTool = tool({
  description: "Speichert ein neues Unternehmen in der Datenbank.",
  inputSchema: z.object({
    name: z.string(),
    industry: z.string().optional(),
    location: z.string().optional(),
    website: z.string().optional(),
    contactName: z.string().optional(),
    contactEmail: z.string().optional(),
    contactPhone: z.string().optional(),
    notes: z.string().optional(),
  }),
  execute: async (params) => {
    const company = await prisma.company.create({ data: params });
    return { success: true, companyId: company.id, message: `Unternehmen ${company.name} gespeichert.` };
  },
});

export const saveJobTool = tool({
  description: "Speichert eine offene Stelle in der Datenbank.",
  inputSchema: z.object({
    companyId: z.string(),
    title: z.string(),
    description: z.string().optional(),
    location: z.string().optional(),
    salary: z.string().optional(),
    requirements: z.array(z.string()).optional(),
  }),
  execute: async (params) => {
    const job = await prisma.job.create({
      data: { ...params, requirements: params.requirements ?? [] },
    });
    return { success: true, jobId: job.id, message: `Stelle ${job.title} gespeichert.` };
  },
});

export const getPipelineTool = tool({
  description: "Gibt eine Uebersicht der Kandidaten-Pipeline nach Status gruppiert zurueck.",
  inputSchema: z.object({}),
  execute: async () => {
    const candidates = await prisma.candidate.findMany({
      select: { id: true, firstName: true, lastName: true, status: true, currentTitle: true },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const grouped: Record<string, any[]> = {};
    for (const c of candidates) {
      const key = c.status;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({ id: c.id, name: `${c.firstName} ${c.lastName}`, title: c.currentTitle });
    }
    return { total: candidates.length, byStatus: grouped };
  },
});

export const searchCompaniesTool = tool({
  description: "Sucht in der internen Datenbank nach Unternehmen.",
  inputSchema: z.object({
    query: z.string().optional(),
    location: z.string().optional(),
  }),
  execute: async ({ query, location }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (location) where.location = { contains: location, mode: "insensitive" };
    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { industry: { contains: query, mode: "insensitive" } },
      ];
    }
    const companies = await prisma.company.findMany({
      where,
      take: 10,
      include: { _count: { select: { jobs: true } } },
    });
    return {
      count: companies.length,
      companies: companies.map((c) => ({
        id: c.id,
        name: c.name,
        industry: c.industry,
        location: c.location,
        openJobs: c._count.jobs,
        contact: c.contactName,
      })),
    };
  },
});

export const searchVincereCandidatesTool = tool({
  description:
    "Sucht Kandidaten direkt im Vincere-System (ATS) nach Stichwort, z.B. Name, Skill oder Jobtitel.",
  inputSchema: z.object({
    keyword: z.string(),
    rows: z.number().optional().default(10),
  }),
  execute: async ({ keyword, rows }) => {
    try {
      const { searchVincereCandidates } = await import("@/lib/vincere");
      const items = await searchVincereCandidates(keyword, rows ?? 10);
      return {
        count: items.length,
        candidates: items.map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          title: c.current_job_title,
          company: c.current_employer,
        })),
      };
    } catch (e) {
      return { error: e.message };
    }
  },
});

export const searchVincereCompaniesTool = tool({
  description: "Sucht Unternehmen direkt im Vincere-System (ATS) nach Stichwort. Hinweis: fuer Doppelte-Anlegen-Pruefung NIE manuell mit diesem Tool vorab checken - onboardCompanyToVincere macht das intern zuverlaessiger (sucht anhand des offiziellen Impressum-Namens statt des Job-Board-Namens).",
  inputSchema: z.object({
    keyword: z.string(),
    rows: z.number().optional().default(10),
  }),
  execute: async ({ keyword, rows }) => {
    try {
      const { searchVincereCompanies } = await import("@/lib/vincere");
      const items = await searchVincereCompanies(keyword, rows ?? 10);
      return {
        count: items.length,
        companies: items.map((c) => ({ id: c.id, name: c.name, website: c.website })),
      };
    } catch (e) {
      return { error: e.message };
    }
  },
});

export const createVincereCompanyTool = tool({
  description: "Legt ein neues Unternehmen direkt im Vincere-System (ATS) an.",
  inputSchema: z.object({
    name: z.string(),
    website: z.string().optional(),
    city: z.string().optional(),
    postcode: z.string().optional(),
  }),
  execute: async (params) => {
    try {
      const { createVincereCompany } = await import("@/lib/vincere");
      const result = await createVincereCompany(params);
      return result;
    } catch (e) {
      return { error: e.message };
    }
  },
});

export const addCandidateToVincereTool = tool({
  description:
    "Uebertraegt einen bereits in der lokalen Datenbank gespeicherten Kandidaten zusaetzlich ins Vincere-System (ATS).",
  inputSchema: z.object({
    candidateId: z.string(),
  }),
  execute: async ({ candidateId }) => {
    try {
      const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
      if (!candidate) return { success: false, message: "Kandidat nicht gefunden." };
      const { createVincereCandidate } = await import("@/lib/vincere");
      const result = await createVincereCandidate({
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        email: candidate.email ?? undefined,
        phone: candidate.phone ?? undefined,
        currentTitle: candidate.currentTitle ?? undefined,
      });
      return result;
    } catch (e) {
      return { error: e.message };
    }
  },
});

export const addVincereContactTool = tool({
  description:
    "Legt eine Ansprechperson (Kontakt) in Vincere an und verknuepft sie mit einem Unternehmen. Nutze das nach findCompanyContact, um den gefundenen Kontakt zu speichern.",
  inputSchema: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    position: z.string().optional(),
    companyName: z.string().optional(),
    companyId: z.number().optional(),
  }),
  execute: async (params) => {
    try {
      const { createVincereContact } = await import("@/lib/vincere");
      const result = await createVincereContact(params);
      return result;
    } catch (e) {
      return { error: e.message };
    }
  },
});

export const searchJobsTool = tool({
  description:
    "Sucht offene Stellenanzeigen ueber die Bundesagentur-fuer-Arbeit-Jobsuche-API, StepStone und Indeed gleichzeitig (parallel, dedupliziert). Gibt eine Liste mit Titel, Unternehmen, Standort, Quelle und Link zurueck. Nutze umkreis fuer einen Radius in km um den Ort.",
  inputSchema: z.object({
    was: z.string().describe("Jobtitel oder Suchbegriff, z.B. 'DevOps Engineer'"),
    wo: z.string().describe("Ort, z.B. 'Hamburg'"),
    umkreis: z.number().optional().default(50).describe("Umkreis in km"),
    size: z.number().optional().default(25),
  }),
  execute: async ({ was, wo, umkreis, size }) => {
    try {
      const { searchAllJobs } = await import("@/lib/jobsearch");
      return await searchAllJobs({ was, wo, umkreis, size });
    } catch (e) {
      return { error: e.message };
    }
  },
});

export const getJobDetailsTool = tool({
  description:
    "Ruft Details zu einer Stellenanzeige von der Bundesagentur fuer Arbeit ab (refnr aus searchJobs), inkl. Beschreibung, Arbeitgeber-Homepage und ggf. Kontaktdaten.",
  inputSchema: z.object({ refnr: z.string() }),
  execute: async ({ refnr }) => {
    try {
      const { getJobDetailBA } = await import("@/lib/jobsearch");
      return await getJobDetailBA(refnr);
    } catch (e) {
      return { error: e.message };
    }
  },
});

export const findCompanyContactTool = tool({
  description:
    "Findet automatisch eine Ansprechperson fuer ein Unternehmen. Prioritaet: 1) Kontakt aus Stellentext/externer URL 2) HR/Recruiting-Kontakt von der Firmenwebsite (Karriere/Kontakt/Team-Seite) 3) Geschaeftsfuehrung aus dem Impressum, falls keine HR-Person gefunden wird. E-Mail-Prioritaet: HR-E-Mail (bewerbung@/personal@/karriere@) vor persoenlicher E-Mail der gefundenen Person vor allgemeiner info@-Adresse als letzter Fallback. Nutze das fuer jedes Unternehmen aus searchJobs, das noch keinen Ansprechpartner in Vincere hat.",
  inputSchema: z.object({
    companyName: z.string(),
    city: z.string().optional(),
    website: z.string().optional(),
    jobText: z.string().optional().describe("Volltext der Stellenbeschreibung, falls vorhanden - wird zuerst durchsucht"),
    externeUrl: z.string().optional().describe("Externe Bewerbungs-URL der Stellenanzeige, falls vorhanden"),
  }),
  execute: async (params) => {
    try {
      const { findContact } = await import("@/lib/find-contact");
      // FIX: findContact erwartet das Feld "name", das Tool-Schema nennt es "companyName" -
      // ohne diese Zuordnung kam immer error_no_name zurueck, egal was uebergeben wurde.
      return await findContact({
        name: params.companyName,
        city: params.city,
        website: params.website,
        jobText: params.jobText,
        externeUrl: params.externeUrl,
      });
    } catch (e) {
      return { error: e.message };
    }
  },
});

export const onboardCompanyToVincereTool = tool({
  description:
    "Kompletter Lead-Import-Schritt fuer ein neues Unternehmen in Vincere. Ablauf: 1) sucht Ansprechpartner + Standort + offiziellen Firmennamen aus dem Impressum, 2) gleicht ZUERST anhand des offiziellen Impressum-Namens gegen Vincere ab (nicht nur der Job-Board-Name, der oft abweicht) - existiert die Firma bereits, wird NICHTS doppelt angelegt (dieser Abgleich ist die einzige noetige Duplikat-Pruefung - kein separates searchVincereCompanies vorher noetig), 3) legt das Unternehmen NUR an, wenn ein Ansprechpartner gefunden wurde (Name+Email oder Email) - STRIKTE REGEL: es darf NIE ein Unternehmen ohne Kontakt in Vincere landen, wird keiner gefunden meldet das Tool das explizit als 'kein Kontakt gefunden - nicht angelegt' statt die Firma trotzdem anzulegen. Nutze IMMER dieses Tool fuer den Lead-Import aus der Jobsuche, nie createVincereCompany isoliert.",
  inputSchema: z.object({
    companyName: z.string().describe("Firmenname wie auf dem Jobportal angegeben"),
    city: z.string().optional().describe("Ort, falls aus der Stellenanzeige bekannt"),
    website: z.string().optional(),
    jobText: z.string().optional().describe("Volltext der Stellenbeschreibung, falls vorhanden"),
    externeUrl: z.string().optional().describe("Externe Bewerbungs-URL der Stellenanzeige, falls vorhanden"),
  }),
  execute: async (params) => {
    try {
      const { findContact } = await import("@/lib/find-contact");
      const { createVincereCompany, createVincereContact, findVincereCompanyByName } = await import("@/lib/vincere");

      const contact = await findContact({
        name: params.companyName,
        city: params.city,
        website: params.website,
        jobText: params.jobText,
        externeUrl: params.externeUrl,
      });

      // Fuer den Vincere-Abgleich und das Anlegen wird der offizielle (rechtliche) Name aus dem
      // Impressum bevorzugt, da der Job-Board-Name oft abweicht (z.B. Kurzform ohne Rechtsform).
      const nameForVincere = contact.officialName || params.companyName;

      const existing = await findVincereCompanyByName(nameForVincere);
      if (existing) {
        return {
          skipped: true,
          reason: "already_exists",
          message: `Unternehmen "${nameForVincere}" existiert bereits in Vincere (ID ${existing.id}) - nicht doppelt angelegt.`,
          existingId: existing.id,
          contactFound: {
            name: contact.firstName ? `${contact.firstName} ${contact.lastName}` : null,
            email: contact.email,
            position: contact.position,
            source: contact.source,
          },
        };
      }

      const hasContact = !!(contact.email || (contact.firstName && contact.lastName));
      if (!hasContact) {
        // STRIKTE REGEL: kein Unternehmen ohne Ansprechpartner anlegen
        return {
          skipped: true,
          reason: "no_contact_found",
          message: `Kein Ansprechpartner fuer "${params.companyName}" gefunden - Unternehmen wurde NICHT in Vincere angelegt (Regel: keine Firma ohne Kontakt).`,
          nameForVincere,
          website: contact.website || null,
          address: contact.address || null,
        };
      }

      const companyResult = await createVincereCompany({
        name: nameForVincere,
        website: params.website || contact.website || undefined,
        city: params.city,
        address: contact.address || undefined,
        phone: contact.phone || undefined,
      });

      const companyId = companyResult.id || companyResult.existingId;

      let contactResult = null;
      if (companyId) {
        contactResult = await createVincereContact({
          firstName: contact.firstName || undefined,
          lastName: contact.lastName || undefined,
          email: contact.email || undefined,
          phone: contact.phone || undefined,
          position: contact.position || undefined,
          companyId,
        });
      }

      return {
        skipped: false,
        company: companyResult,
        contact: contactResult,
        contactFound: {
          name: contact.firstName ? `${contact.firstName} ${contact.lastName}` : null,
          email: contact.email,
          phone: contact.phone,
          position: contact.position,
          address: contact.address,
          source: contact.source,
        },
      };
    } catch (e) {
      return { error: e.message };
    }
  },
});

export const listIncompleteVincereCompaniesTool = tool({
  description:
    "Listet Unternehmen in Vincere, denen der Standort (head_quarter) fehlt. Nutze das, um herauszufinden, welche bereits angelegten Firmen noch per backfillVincereCompany nachgebessert werden muessen.",
  inputSchema: z.object({
    rows: z.number().optional().default(100),
  }),
  execute: async ({ rows }) => {
    try {
      const { listVincereCompanies } = await import("@/lib/vincere");
      const { items, total } = await listVincereCompanies(0, rows ?? 100);
      const incomplete = items.filter((c) => !c.head_quarter);
      return {
        totalInVincere: total,
        checked: items.length,
        incompleteCount: incomplete.length,
        incomplete: incomplete.map((c) => ({ id: c.id, name: c.name, website: c.website })),
      };
    } catch (e) {
      return { error: e.message };
    }
  },
});

export const backfillVincereCompanyTool = tool({
  description:
    "Ergaenzt eine bereits in Vincere existierende, unvollstaendige Firma nachtraeglich um Standort (aus dem Impressum) und Ansprechpartner. Nutze companyId aus listIncompleteVincereCompanies.",
  inputSchema: z.object({
    companyId: z.number(),
    companyName: z.string(),
    city: z.string().optional(),
    website: z.string().optional(),
  }),
  execute: async (params) => {
    try {
      const { findContact } = await import("@/lib/find-contact");
      const { updateVincereCompany, createVincereContact, buildHeadQuarter } = await import("@/lib/vincere");

      const contact = await findContact({
        name: params.companyName,
        city: params.city,
        website: params.website,
      });

      const headQuarter = buildHeadQuarter({ city: params.city, address: contact.address });
      const companyUpdate = await updateVincereCompany(params.companyId, {
        headQuarter: headQuarter || undefined,
        website: params.website || contact.website || undefined,
        companyName: params.companyName,
      });

      let contactResult = null;
      if (contact.email || (contact.firstName && contact.lastName)) {
        contactResult = await createVincereContact({
          firstName: contact.firstName || undefined,
          lastName: contact.lastName || undefined,
          email: contact.email || undefined,
          phone: contact.phone || undefined,
          position: contact.position || undefined,
          companyId: params.companyId,
        });
      }

      return { companyUpdate, contactResult, contactFound: contact };
    } catch (e) {
      return { error: e.message };
    }
  },
});

export const testVincereLocationApiTool = tool({
  description: "DIAGNOSE: Testet die Vincere Locations-API fuer eine Firma (GET bestehende Locations, dann Test-POST mit einer Beispieladresse).",
  inputSchema: z.object({
    companyId: z.number(),
    address1: z.string().optional(),
    city: z.string().optional(),
    postcode: z.string().optional(),
    country: z.string().optional(),
  }),
  execute: async (params) => {
    try {
      const { getCompanyLocations, createCompanyLocation } = await import("@/lib/vincere");
      const existing = await getCompanyLocations(params.companyId);
      let createResult = null;
      if (params.address1 || params.city) {
        createResult = await createCompanyLocation(params.companyId, {
          address1: params.address1,
          city: params.city,
          postcode: params.postcode,
          country: params.country || "Germany",
        });
      }
      return { existing, createResult };
    } catch (e) {
      return { error: e.message };
    }
  },
});

export const testCreateVincereJobTool = tool({
  description: "DIAGNOSE: Testet die Vincere Job-API mit beliebigen Feldern und optionalem Pfad, um das exakte Schema/den Endpunkt herauszufinden. Gib rohe Feldnamen als JSON-String in fieldsJson.",
  inputSchema: z.object({
    fieldsJson: z.string().describe("JSON-Objekt als String mit den Feldern fuer den Job, z.B. {\"job_title\":\"X\",\"company_id\":123}"),
    path: z.string().optional().describe("Optionaler API-Pfad, Standard /api/v2/job. Zum Testen von Alternativen wie /api/v2/position."),
  }),
  execute: async ({ fieldsJson, path }) => {
    try {
      const { testCreateVincereJob } = await import("@/lib/vincere");
      const fields = JSON.parse(fieldsJson);
      return await testCreateVincereJob(fields, path);
    } catch (e) {
      return { error: e.message };
    }
  },
});


// ===========================================================================
// SPEKULATIVE STELLENANZEIGEN
// ===========================================================================
// Anzeigen zur Kandidatengewinnung ohne konkretes Kundenmandat, alle an der
// Sammelfirma "Stellenanzeigen" (14534) mit Kontakt "Recruiting Team" (37109).
//
// Das Feldschema von POST /api/v2/position ist heikel: compensation muss ein
// Objekt sein, der Standort ist eine ID statt Freitext, und beim Anlegen eines
// Standorts ist location_types Pflicht - fehlt es, antwortet Vincere mit einem
// nichtssagenden 500er. Diese Fallstricke stehen hier einmal im Code statt in
// jeder Anweisung an den Agenten.

const SPEC_COMPANY_ID = 14534;
const SPEC_CONTACT_ID = 37109;

/** Standorte der Sammelfirma. Schluessel sind normalisiert (klein, ohne Umlaute). */
const SPEC_LOCATIONS: Record<string, number> = {
  berlin: 14097,
  hamburg: 14092,
  muenchen: 14098,
  koeln: 14109,
  "frankfurt am main": 14101,
  frankfurt: 14101,
  stuttgart: 14111,
  duesseldorf: 14106,
  leipzig: 14093,
  dortmund: 14103,
  essen: 14094,
  bremen: 14107,
  dresden: 14100,
  hannover: 14095,
  nuernberg: 14099,
  duisburg: 14104,
  bochum: 14110,
  wuppertal: 14102,
  bielefeld: 14105,
  bonn: 14096,
  muenster: 14108,
};

/** "Muenchen", "MÜNCHEN" und "münchen" sollen denselben Standort treffen. */
function normalizeCity(city: string): string {
  return (city || "")
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/\s+/g, " ")
    .trim();
}

const STANDARD_BENEFITS = [
  "Wettbewerbsfähiges Gehalt mit regelmäßiger Überprüfung",
  "Flexible Arbeitszeiten und hybrides Arbeiten",
  "Fachliche Weiterbildung und Zertifizierungsunterstützung",
  "30 Urlaubstage",
  "Modernes Equipment und aktuelle Softwarelizenzen",
  "Betriebliche Altersversorgung und Zuschüsse",
];

const ANSPRECHPARTNER =
  "<h4>IHR ANSPRECHPARTNER</h4><p>Sie haben Interesse oder möchten mehr erfahren? " +
  "Senden Sie Ihren Lebenslauf an: info@codari.de – Einer unserer Berater meldet " +
  "sich zeitnah bei Ihnen.</p>";

const GLEICHSTELLUNG =
  "<h4>GLEICHSTELLUNG</h4><p>Wir freuen uns über Bewerbungen von Menschen jeglichen " +
  "Geschlechts, Alters, jeder Nationalität, Religion oder Weltanschauung sowie " +
  "Bewerbungen von Menschen mit Behinderungen. Bei CODARI zählt Ihre Qualifikation " +
  "– nicht Ihre Herkunft.</p>";

/** Schuetzt davor, dass roher Text die HTML-Struktur zerlegt. */
function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function list(items: string[]): string {
  return "<ul>" + items.map((i) => "<li>" + esc(i) + "</li>").join("") + "</ul>";
}

/**
 * Baut die oeffentliche Beschreibung im CODARI-Hausformat.
 * Reihenfolge und Abschnitte sind bewusst fest verdrahtet - sie sind der
 * Wiedererkennungswert der Anzeigen und sollen nicht je nach Tagesform variieren.
 *
 * Kein Gehalt im oeffentlichen Text: die Spanne gehoert in compensation und in
 * die interne Beschreibung.
 */
function buildPublicDescription(params: {
  intro: string;
  tasks: string[];
  requirements: string[];
  benefits?: string[];
}): string {
  return (
    "<h3>CODARI – Personalberatung IT &amp; Engineering</h3>" +
    "<p>" + esc(params.intro) + "</p>" +
    "<h4>IHRE AUFGABEN</h4>" + list(params.tasks) +
    "<h4>WAS SIE MITBRINGEN</h4>" + list(params.requirements) +
    "<h4>DAS BIETET UNSER MANDANT</h4>" + list(params.benefits?.length ? params.benefits : STANDARD_BENEFITS) +
    ANSPRECHPARTNER +
    GLEICHSTELLUNG
  );
}

function isoDate(d?: string): string {
  const base = d && /^\d{4}-\d{2}-\d{2}/.test(d) ? d.slice(0, 10) : new Date().toISOString().slice(0, 10);
  return base + "T00:00:00.000Z";
}

/**
 * Legt einen Standort an der Sammelfirma an. location_types ist Pflicht.
 * Koordinaten sind optional, sorgen aber fuer einen sauberen Kartenpin.
 */
async function ensureSpecLocation(params: {
  city: string;
  postCode?: string;
  latitude?: number;
  longitude?: number;
}) {
  const key = normalizeCity(params.city);
  if (SPEC_LOCATIONS[key]) {
    return { ok: true, id: SPEC_LOCATIONS[key], created: false };
  }

  const fields: Record<string, unknown> = {
    location_name: params.city,
    city: params.city,
    country_code: "DE",
    location_types: ["WORKPLACE"],
  };
  if (params.postCode) fields.post_code = params.postCode;
  if (typeof params.latitude === "number") fields.latitude = params.latitude;
  if (typeof params.longitude === "number") fields.longitude = params.longitude;

  const { createCompanyLocation } = await import("@/lib/vincere");
  const res = await createCompanyLocation(SPEC_COMPANY_ID, fields);
  const id = res?.data?.id ?? null;
  if (!res?.ok || !id) {
    return { ok: false, id: null, created: false, status: res?.status, data: res?.data };
  }
  SPEC_LOCATIONS[key] = id; // nur fuer die Laufzeit; dauerhaft gehoert die ID in die Tabelle oben
  return { ok: true, id, created: true };
}

/**
 * Legt eine spekulative Stellenanzeige an.
 *
 * Hinweis zum internen Recruiter: Der laesst sich ueber diesen Endpunkt nicht
 * setzen und wird in Vincere per Massenbearbeitung nachgetragen.
 *
 * Hinweis zu Duplikaten: Vincere lehnt Anzeigen mit identischem Titel, Open Date
 * und Kontakt ab (errorCode DUPLICATED). Das ist erwuenscht. Soll bewusst eine
 * zweite Anzeige gleichen Titels entstehen, ein anderes openDate waehlen.
 */
async function createSpeculativeJob(params: {
  city: string;
  jobTitle: string;
  intro: string;
  tasks: string[];
  requirements: string[];
  benefits?: string[];
  internalNote: string;
  minPay: number;
  maxPay: number;
  currency?: string;
  openDate?: string;
  postCode?: string;
  latitude?: number;
  longitude?: number;
}) {
  if (!params.city || !params.jobTitle) {
    return { ok: false, error: "city und jobTitle sind Pflicht." };
  }
  if (!params.tasks?.length || !params.requirements?.length) {
    return { ok: false, error: "tasks und requirements duerfen nicht leer sein." };
  }
  if (!(params.minPay > 0) || !(params.maxPay > params.minPay)) {
    return { ok: false, error: "minPay und maxPay muessen plausibel sein (maxPay groesser minPay)." };
  }

  const loc = await ensureSpecLocation({
    city: params.city,
    postCode: params.postCode,
    latitude: params.latitude,
    longitude: params.longitude,
  });
  if (!loc.ok) {
    return {
      ok: false,
      error:
        "Standort fuer " + params.city + " konnte nicht angelegt werden. " +
        "Bekannte Staedte: " + Object.keys(SPEC_LOCATIONS).join(", "),
      details: loc,
    };
  }

  const date = isoDate(params.openDate);

  const fields: Record<string, unknown> = {
    job_title: params.jobTitle,
    company_id: SPEC_COMPANY_ID,
    contact_id: SPEC_CONTACT_ID,
    company_location_id: loc.id,
    registration_date: date,
    open_date: date,
    job_type: "PERMANENT",
    employment_type: "FULL_TIME",
    compensation: {
      pay_type: "SALARY",
      min_pay: params.minPay,
      max_pay: params.maxPay,
      currency: params.currency || "EUR",
    },
    internal_description:
      "SPEKULATIVE ANZEIGE – Kandidatengewinnung, kein konkretes Mandat.\n" +
      "Region: " + params.city + "\n" +
      "Zielgehalt: " + params.minPay.toLocaleString("de-DE") + " – " +
      params.maxPay.toLocaleString("de-DE") + " " + (params.currency || "EUR") + " p.a.\n\n" +
      params.internalNote,
    public_description: buildPublicDescription({
      intro: params.intro,
      tasks: params.tasks,
      requirements: params.requirements,
      benefits: params.benefits,
    }),
  };

  const { testCreateVincereJob } = await import("@/lib/vincere");
  const res = await testCreateVincereJob(fields, "/api/v2/position");

  if (!res?.ok) {
    const duplicate = res?.data?.errorCode === "DUPLICATED";
    return {
      ok: false,
      duplicate,
      error: duplicate
        ? "Es gibt bereits eine Anzeige mit diesem Titel, Open Date und Kontakt. " +
          "Fuer eine bewusste Zweitanzeige ein anderes openDate waehlen."
        : "Vincere hat die Anzeige abgelehnt.",
      status: res?.status,
      data: res?.data,
    };
  }

  return {
    ok: true,
    jobId: res?.data?.id ?? null,
    city: params.city,
    locationId: loc.id,
    locationCreated: loc.created,
    openDate: date,
    hint: "Interner Recruiter ist nicht gesetzt – in Vincere per Massenbearbeitung nachtragen.",
  };
}

export const createSpeculativeJobTool = tool({
  description:
    "Legt eine spekulative Stellenanzeige in Vincere an (Kandidatengewinnung ohne konkretes Kundenmandat). " +
    "Erzeugt die oeffentliche Beschreibung automatisch im CODARI-Hausformat: Sie-Form, Abschnitte IHRE AUFGABEN, " +
    "WAS SIE MITBRINGEN, DAS BIETET UNSER MANDANT, IHR ANSPRECHPARTNER, GLEICHSTELLUNG. Standort, Sammelfirma, " +
    "Kontakt und Pflichtfelder setzt das Tool selbst. Nutze IMMER dieses Tool fuer spekulative Anzeigen, nie " +
    "testCreateVincereJob von Hand. Gib das Gehalt nur ueber minPay/maxPay an - es erscheint bewusst nicht im " +
    "oeffentlichen Text.",
  inputSchema: z.object({
    city: z.string().describe("Stadt, z.B. Leipzig. Bekannte Staedte haben bereits einen Standort."),
    jobTitle: z.string().describe("Vollstaendiger Titel inkl. (m/w/d) und Stadt, z.B. 'DevOps Engineer (m/w/d) – Leipzig'"),
    intro: z.string().describe("Ein Absatz zum Mandanten und zur Rolle. Allgemein halten, aber nicht wie ein Platzhalter klingen."),
    tasks: z.array(z.string()).describe("Sechs bis sieben Aufgaben"),
    requirements: z.array(z.string()).describe("Sechs bis sieben Anforderungen"),
    benefits: z.array(z.string()).optional().describe("Fuenf bis sechs Punkte. Weglassen nutzt den CODARI-Standard."),
    internalNote: z.string().describe("Interne Screening-Kriterien fuer das Telefoninterview. Nicht oeffentlich."),
    minPay: z.number(),
    maxPay: z.number(),
    currency: z.string().optional(),
    openDate: z.string().optional().describe("YYYY-MM-DD. Nur noetig, wenn bewusst eine Zweitanzeige gleichen Titels entstehen soll."),
    postCode: z.string().optional().describe("Nur noetig bei einer Stadt ohne bestehenden Standort"),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }),
  execute: async (params) => {
    try {
      return await createSpeculativeJob(params);
    } catch (e) {
      return { error: e.message };
    }
  },
});

export const allTools = {
  saveCandidate: saveCandidateTool,
  searchCandidates: searchCandidatesTool,
  updateCandidateStatus: updateCandidateStatusTool,
  draftOutreach: draftOutreachTool,
  saveCompany: saveCompanyTool,
  saveJob: saveJobTool,
  getPipeline: getPipelineTool,
  searchCompanies: searchCompaniesTool,
  searchVincereCandidates: searchVincereCandidatesTool,
  searchVincereCompanies: searchVincereCompaniesTool,
  createVincereCompany: createVincereCompanyTool,
  addCandidateToVincere: addCandidateToVincereTool,
  addVincereContact: addVincereContactTool,
  searchJobs: searchJobsTool,
  getJobDetails: getJobDetailsTool,
  findCompanyContact: findCompanyContactTool,
  onboardCompanyToVincere: onboardCompanyToVincereTool,
  listIncompleteVincereCompanies: listIncompleteVincereCompaniesTool,
  backfillVincereCompany: backfillVincereCompanyTool,
  testVincereLocationApi: testVincereLocationApiTool,
  testCreateVincereJob: testCreateVincereJobTool,
  createSpeculativeJob: createSpeculativeJobTool,
};
