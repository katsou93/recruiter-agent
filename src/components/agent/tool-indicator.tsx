"use client";

import { cn } from "@/lib/utils";
import {
  UserPlus,
  Search,
  Building2,
  Mail,
  BarChart3,
  Briefcase,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

const TOOL_META: Record<string, { label: string; icon: React.ElementType }> = {
  saveCandidate: { label: "Kandidat speichern", icon: UserPlus },
  searchCandidates: { label: "Kandidaten suchen", icon: Search },
  updateCandidateStatus: { label: "Status aktualisieren", icon: RefreshCw },
  draftOutreach: { label: "Anschreiben erstellen", icon: Mail },
  saveCompany: { label: "Unternehmen anlegen", icon: Building2 },
  saveJob: { label: "Stelle anlegen", icon: Briefcase },
  getPipeline: { label: "Pipeline laden", icon: BarChart3 },
  searchCompanies: { label: "Unternehmen suchen", icon: Search },
};

type ToolState = "input-streaming" | "input-available" | "output-available" | "output-error";

interface ToolCallProps {
  toolName: string;
  state: ToolState;
  output?: unknown;
}

export function ToolCallIndicator({ toolName, state, output }: ToolCallProps) {
  const meta = TOOL_META[toolName] ?? { label: toolName, icon: RefreshCw };
  const Icon = meta.icon;

  const isRunning = state === "input-streaming" || state === "input-available";
  const isError = state === "output-error" || (output as { success?: boolean })?.success === false;
  const isDone = state === "output-available";

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-lg border text-sm my-1",
        isRunning && "border-white/10 bg-white/[0.03] text-white/50",
        isDone && !isError && "border-emerald-500/20 bg-emerald-500/5 text-emerald-400",
        isError && "border-red-500/20 bg-red-500/5 text-red-400"
      )}
    >
      {isRunning ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
      ) : isError ? (
        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
      ) : (
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
      )}
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span className="font-medium">{meta.label}</span>
      {isDone && (output as { message?: string })?.message && (
        <span className="text-xs opacity-70 ml-1 truncate">
          — {(output as { message: string }).message}
        </span>
      )}
    </div>
  );
}
