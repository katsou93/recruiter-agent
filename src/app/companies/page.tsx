"use client";

import { useState, useEffect } from "react";
import { Search, Building2, Globe, Phone, User, Briefcase } from "lucide-react";

interface CompanyWithJobs {
  id: string;
  name: string;
  industry?: string | null;
  website?: string | null;
  location?: string | null;
  size?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  jobs: { id: string; title: string }[];
  _count: { jobs: number };
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<CompanyWithJobs[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      const res = await fetch(`/api/companies?${params}`);
      const data = await res.json();
      setCompanies(data);
      setLoading(false);
    };
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="flex flex-col h-full">
      <div className="h-14 flex items-center px-5 border-b border-white/[0.06] shrink-0 gap-4">
        <h1 className="font-semibold text-sm text-white/80">Unternehmen</h1>
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
        <span className="text-xs text-white/30 ml-auto">{companies.length} Unternehmen</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-[#6366f1]/30 border-t-[#6366f1] rounded-full animate-spin" />
          </div>
        ) : companies.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <Building2 className="w-8 h-8 text-white/20" />
            <p className="text-sm text-white/40">Keine Unternehmen gefunden</p>
            <p className="text-xs text-white/25">Sag dem Agenten, er soll eines anlegen</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {companies.map((c) => (
              <div key={c.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 hover:border-white/10 transition-colors">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4 text-white/40" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-white">{c.name}</p>
                    {c.industry && <p className="text-xs text-white/40">{c.industry}</p>}
                    {c.location && <p className="text-xs text-white/30">📍 {c.location}</p>}
                  </div>
                </div>

                {c.jobs.length > 0 && (
                  <div className="mb-3 space-y-1">
                    {c.jobs.slice(0, 2).map((j) => (
                      <div key={j.id} className="flex items-center gap-1.5 text-xs text-white/50">
                        <Briefcase className="w-3 h-3" />
                        {j.title}
                      </div>
                    ))}
                    {c._count.jobs > 2 && (
                      <p className="text-xs text-white/30">+{c._count.jobs - 2} weitere</p>
                    )}
                  </div>
                )}

                <div className="pt-2 border-t border-white/[0.05] space-y-1">
                  {c.contactName && (
                    <div className="flex items-center gap-1.5 text-xs text-white/40">
                      <User className="w-3 h-3" /> {c.contactName}
                    </div>
                  )}
                  {c.contactEmail && (
                    <a href={`mailto:${c.contactEmail}`} className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60">
                      📧 {c.contactEmail}
                    </a>
                  )}
                  {c.website && (
                    <a href={c.website} target="_blank" rel="noopener" className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60">
                      <Globe className="w-3 h-3" /> {c.website.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
