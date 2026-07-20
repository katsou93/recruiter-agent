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
};
