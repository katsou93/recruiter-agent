export type CandidateStatus =
  | "NEW"
  | "CONTACTED"
  | "REPLIED"
  | "INTERVIEW"
  | "OFFER"
  | "PLACED"
  | "REJECTED"
  | "INACTIVE";

export type JobStatus = "OPEN" | "FILLED" | "PAUSED" | "CLOSED";
export type OutreachStatus = "DRAFT" | "SENT" | "REPLIED" | "NO_REPLY";

export interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  linkedinUrl?: string | null;
  xingUrl?: string | null;
  currentTitle?: string | null;
  currentCompany?: string | null;
  location?: string | null;
  skills: string[];
  notes?: string | null;
  status: CandidateStatus;
  source?: string | null;
  salary?: string | null;
  availability?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Company {
  id: string;
  name: string;
  industry?: string | null;
  website?: string | null;
  location?: string | null;
  size?: string | null;
  notes?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Job {
  id: string;
  title: string;
  description?: string | null;
  salary?: string | null;
  location?: string | null;
  remote: boolean;
  status: JobStatus;
  companyId: string;
  company?: Company;
  createdAt: Date;
  updatedAt: Date;
}

export interface Outreach {
  id: string;
  subject: string;
  body: string;
  status: OutreachStatus;
  sentAt?: Date | null;
  repliedAt?: Date | null;
  candidateId: string;
  candidate?: Candidate;
  jobId?: string | null;
  job?: Job | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentTool {
  name: string;
  description: string;
  status: "idle" | "running" | "done" | "error";
  result?: unknown;
}
