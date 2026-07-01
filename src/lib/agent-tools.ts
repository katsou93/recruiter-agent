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
      take: limit ?? 10,
      orderBy: { updatedAt: "desc" },
    });
    return {
      count: candidates.length,
      candidates: candidates.map((c) => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        title: c.currentTitle,
        company: c.currentCompany,
        location: c.location,
        status: c.status,
        skills: c.skills,
        email: c.email,
      })),
    };
  },
});

export const updateCandidateStatusTool = tool({
  description: "Aktualisiert den Status oder Notizen eines Kandidaten.",
  inputSchema: z.object({
    candidateId: z.string(),
    status: z
      .enum(["NEW", "CONTACTED", "REPLIED", "INTERVIEW", "OFFER", "PLACED", "REJECTED", "INACTIVE"])
      .optional(),
    notes: z.string().optional(),
  }),
  execute: async ({ candidateId, status, notes }) => {
    const updated = await prisma.candidate.update({
      where: { id: candidateId },
      data: {
        ...(status && { status }),
        ...(notes && { notes }),
      },
    });
    return {
      success: true,
      message: `Kandidat ${updated.firstName} ${updated.lastName} aktualisiert.`,
    };
  },
});

export const draftOutreachTool = tool({
  description:
    "Erstellt einen personalisierten Anschreiben-Entwurf. Wird als DRAFT gespeichert – du versendest ihn manuell über Outlook.",
  inputSchema: z.object({
    candidateId: z.string(),
    jobTitle: z.string(),
    companyName: z.string(),
    customMessage: z.string().optional(),
    language: z.enum(["de", "en"]).default("de"),
  }),
  execute: async ({ candidateId, jobTitle, companyName, customMessage, language }) => {
    const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
    if (!candidate) return { success: false, message: "Kandidat nicht gefunden." };

    const isDE = language === "de";
    const subject = isDE
      ? `Spannende ${jobTitle}-Position bei ${companyName}`
      : `Exciting ${jobTitle} opportunity at ${companyName}`;

    const titleLine = candidate.currentTitle
      ? isDE
        ? ` Als ${candidate.currentTitle}${candidate.currentCompany ? ` bei ${candidate.currentCompany}` : ""} bringen Sie genau die Erfahrung mit, die unser Kunde sucht.`
        : ` Your background as ${candidate.currentTitle}${candidate.currentCompany ? ` at ${candidate.currentCompany}` : ""} is a great fit.`
      : "";

    const body = isDE
      ? `Hallo ${candidate.firstName},\n\nIch bin auf Ihr Profil aufmerksam geworden und möchte Sie für eine ${jobTitle}-Position bei ${companyName} anfragen.${titleLine}\n\n${customMessage ? customMessage + "\n\n" : ""}Hätten Sie Interesse an einem kurzen Austausch? Ich freue mich über Ihre Rückmeldung.\n\nMit freundlichen Grüßen`
      : `Hi ${candidate.firstName},\n\nI came across your profile and would love to discuss a ${jobTitle} opportunity at ${companyName}.${titleLine}\n\n${customMessage ? customMessage + "\n\n" : ""}Would you be open to a brief chat?\n\nBest regards`;

    const outreach = await prisma.outreach.create({
      data: { subject, body, candidateId, status: "DRAFT" },
    });

    return {
      success: true,
      outreachId: outreach.id,
      subject,
      body,
      message: `Entwurf für ${candidate.firstName} ${candidate.lastName} erstellt. Betreff: "${subject}"`,
    };
  },
});

export const saveCompanyTool = tool({
  description: "Speichert ein neues Unternehmen oder Kunden in der Datenbank.",
  inputSchema: z.object({
    name: z.string(),
    industry: z.string().optional(),
    website: z.string().optional(),
    location: z.string().optional(),
    size: z.string().optional(),
    notes: z.string().optional(),
    contactName: z.string().optional(),
    contactEmail: z.string().optional(),
    contactPhone: z.string().optional(),
  }),
  execute: async (params) => {
    const company = await prisma.company.create({ data: params });
    return {
      success: true,
      companyId: company.id,
      message: `Unternehmen "${company.name}" gespeichert.`,
    };
  },
});

export const saveJobTool = tool({
  description: "Legt eine neue offene Stelle für ein Unternehmen an.",
  inputSchema: z.object({
    companyId: z.string(),
    title: z.string(),
    description: z.string().optional(),
    salary: z.string().optional(),
    location: z.string().optional(),
    remote: z.boolean().optional().default(false),
  }),
  execute: async (params) => {
    const company = await prisma.company.findUnique({ where: { id: params.companyId } });
    if (!company) return { success: false, message: "Unternehmen nicht gefunden." };
    const job = await prisma.job.create({ data: { ...params, remote: params.remote ?? false } });
    return {
      success: true,
      jobId: job.id,
      message: `Stelle "${job.title}" bei ${company.name} angelegt.`,
    };
  },
});

export const getPipelineTool = tool({
  description: "Gibt eine Übersicht der aktuellen Kandidaten-Pipeline zurück.",
  inputSchema: z.object({}),
  execute: async () => {
    const pipeline = await prisma.candidate.groupBy({
      by: ["status"],
      _count: { status: true },
    });
    const recent = await prisma.candidate.findMany({
      take: 5,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        status: true,
        currentTitle: true,
        updatedAt: true,
      },
    });
    return {
      pipeline: pipeline.map((p) => ({ status: p.status, count: p._count.status })),
      recentlyUpdated: recent,
    };
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
    description: "Sucht Unternehmen direkt im Vincere-System (ATS) nach Stichwort.",
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
          "Ueberraegt einen bereits in der lokalen Datenbank gespeicherten Kandidaten zusaetzlich ins Vincere-System (ATS).",
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
};
