"use client";

import { useState, useEffect } from "react";
import { Search, UserPlus, ExternalLink, Mail, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Candidate } from "@/types";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  NEW: { label: "Neu", color: "bg-white/10 text-white/60" },
  CONTACTED: { label: "Kontaktiert", color: "bg-blue-500/15 text-blue-400" },
  REPLIED: { label: "Geantwortet", color: "bg-violet-500/15 text-violet-400" },
  INTERVIEW: { label: "Interview", color: "bg-amber-500/15 text-amber-400" },
  OFFER: { label: "Angebot", color: "bg-orange-500/15 text-orange-400" },
  PLACED: { label: "Platziert", color: "bg-emerald-500/15 text-emerald-400" },
  REJECTED: { label: "Abgelehnt", color: "bg-red-500/15 text-red-400" },
  INACTIVE: { label: "Inaktiv", color: "bg-white/5 text-white/30" },
};

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/candidates?${params}`);
      const data = await res.json();
      setCandidates(data);
      setLoading(false);
    };

    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [query, statusFilter]);

  return (
    <div className="flex flex-col h-full">
      <div className="h-14 flex items-center px-5 border-b border-white/[0.06] shrink-0 gap-4">
        <h1 className="font-semibold text-sm text-white/80">Kandidaten</h1>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input
            type="text"
            placeholder="Suchen..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#6366f1]/50"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-white/70 focus:outline-none"
        >
          <option value="">Alle Status</option>
          {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <span className="text-xs text-white/30 ml-auto">
          {candidates.length} Kandidaten
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-[#6366f1]/30 border-t-[#6366f1] rounded-full animate-spin" />
          </div>
        ) : candidates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <UserPlus className="w-8 h-8 text-white/20" />
            <p className="text-sm text-white/40">Keine Kandidaten gefunden</p>
            <p className="text-xs text-white/25">Sag dem Agenten, er soll einen anlegen</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {candidates.map((c) => {
              const statusMeta = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.NEW;
              return (
                <div
                  key={c.id}
                  className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 hover:border-white/10 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="font-medium text-sm text-white">
                        {c.firstName} {c.lastName}
                      </p>
                      {c.currentTitle && (
                        <p className="text-xs text-white/50 mt-0.5">{c.currentTitle}</p>
                      )}
                      {c.currentCompany && (
                        <p className="text-xs text-white/35">{c.currentCompany}</p>
                      )}
                    </div>
                    <span className={cn("text-[11px] px-2 py-0.5 rounded-full shrink-0", statusMeta.color)}>
                      {statusMeta.label}
                    </span>
                  </div>

                  {c.location && (
                    <p className="text-xs text-white/35 mb-2">📍 {c.location}</p>
                  )}

                  {c.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {c.skills.slice(0, 4).map((s) => (
                        <span key={s} className="text-[11px] px-1.5 py-0.5 rounded bg-white/[0.06] text-white/50">
                          {s}
                        </span>
                      ))}
                      {c.skills.length > 4 && (
                        <span className="text-[11px] text-white/30">+{c.skills.length - 4}</span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-2 border-t border-white/[0.05]">
                    {c.email && (
                      <a href={`mailto:${c.email}`} className="text-white/30 hover:text-white/60 transition-colors">
                        <Mail className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {c.phone && (
                      <a href={`tel:${c.phone}`} className="text-white/30 hover:text-white/60 transition-colors">
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {c.linkedinUrl && (
                      <a href={c.linkedinUrl} target="_blank" rel="noopener" className="text-white/30 hover:text-blue-400 transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <span className="ml-auto text-[11px] text-white/25">
                      {c.source ?? "manual"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
