"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { Candidate, CandidateStatus } from "@/types";

const COLUMNS: { status: CandidateStatus; label: string; color: string }[] = [
  { status: "NEW", label: "Neu", color: "border-white/10" },
  { status: "CONTACTED", label: "Kontaktiert", color: "border-blue-500/30" },
  { status: "REPLIED", label: "Geantwortet", color: "border-violet-500/30" },
  { status: "INTERVIEW", label: "Interview", color: "border-amber-500/30" },
  { status: "OFFER", label: "Angebot", color: "border-orange-500/30" },
  { status: "PLACED", label: "Platziert", color: "border-emerald-500/30" },
];

export default function PipelinePage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/candidates")
      .then((r) => r.json())
      .then((d) => { setCandidates(d); setLoading(false); });
  }, []);

  const byStatus = (status: CandidateStatus) =>
    candidates.filter((c) => c.status === status);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-[#6366f1]/30 border-t-[#6366f1] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="h-14 flex items-center px-5 border-b border-white/[0.06] shrink-0">
        <h1 className="font-semibold text-sm text-white/80">Pipeline</h1>
        <span className="ml-3 text-xs text-white/30">{candidates.length} Kandidaten gesamt</span>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        <div className="flex gap-3 h-full min-w-max">
          {COLUMNS.map(({ status, label, color }) => {
            const items = byStatus(status);
            return (
              <div key={status} className="w-60 flex flex-col">
                <div className={cn("flex items-center justify-between mb-2 px-1")}>
                  <span className="text-xs font-medium text-white/60">{label}</span>
                  <span className="text-xs text-white/30 tabular-nums">{items.length}</span>
                </div>

                <div className={cn("flex-1 rounded-xl border bg-white/[0.02] p-2 space-y-2 overflow-y-auto", color)}>
                  {items.length === 0 && (
                    <div className="flex items-center justify-center h-12">
                      <span className="text-xs text-white/20">Leer</span>
                    </div>
                  )}
                  {items.map((c) => (
                    <div
                      key={c.id}
                      className="bg-white/[0.04] border border-white/[0.06] rounded-lg p-3 hover:border-white/10 transition-colors cursor-default"
                    >
                      <p className="text-xs font-medium text-white/85">
                        {c.firstName} {c.lastName}
                      </p>
                      {c.currentTitle && (
                        <p className="text-[11px] text-white/40 mt-0.5">{c.currentTitle}</p>
                      )}
                      {c.location && (
                        <p className="text-[11px] text-white/30 mt-1">📍 {c.location}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
