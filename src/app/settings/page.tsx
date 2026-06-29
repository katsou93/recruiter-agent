"use client";

import { ExternalLink, Key, Database, Bot } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="h-14 flex items-center px-5 border-b border-white/[0.06] shrink-0">
        <h1 className="font-semibold text-sm text-white/80">Einstellungen</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-5 max-w-2xl space-y-6">

        <section>
          <h2 className="text-sm font-medium text-white/60 mb-3 flex items-center gap-2">
            <Key className="w-4 h-4" /> Erforderliche Umgebungsvariablen
          </h2>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-3">
            {[
              { key: "ANTHROPIC_API_KEY", desc: "Dein Anthropic API Key (console.anthropic.com)", required: true },
              { key: "DATABASE_URL", desc: "Neon PostgreSQL Connection String", required: true },
            ].map(({ key, desc, required }) => (
              <div key={key} className="flex items-start gap-3">
                <code className="text-xs bg-white/[0.07] px-2 py-1 rounded font-mono text-[#6366f1] shrink-0">
                  {key}
                </code>
                <div>
                  <p className="text-xs text-white/60">{desc}</p>
                  {required && <span className="text-[11px] text-amber-400">Pflichtfeld</span>}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-medium text-white/60 mb-3 flex items-center gap-2">
            <Database className="w-4 h-4" /> Datenbank einrichten
          </h2>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-3">
            <p className="text-xs text-white/50">Kostenlose PostgreSQL-Datenbank bei Neon anlegen:</p>
            <ol className="text-xs text-white/50 space-y-1.5 list-decimal list-inside">
              <li>Gehe zu <a href="https://neon.tech" target="_blank" rel="noopener" className="text-[#6366f1] hover:underline">neon.tech</a> → kostenloses Konto anlegen</li>
              <li>Neues Projekt erstellen → Connection String kopieren</li>
              <li>Als <code className="bg-white/[0.07] px-1 rounded">DATABASE_URL</code> in Vercel eintragen</li>
              <li>Prisma migrations ausführen: <code className="bg-white/[0.07] px-1 rounded">npx prisma db push</code></li>
            </ol>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-medium text-white/60 mb-3 flex items-center gap-2">
            <Bot className="w-4 h-4" /> Outlook-Integration (Anschreiben)
          </h2>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
            <p className="text-xs text-white/50 leading-relaxed">
              Der Agent erstellt Anschreiben-Entwürfe, versendet sie aber <strong className="text-white/70">nicht</strong> automatisch.
              Du findest fertige Entwürfe im Kandidaten-Profil und kopierst sie in Outlook.
            </p>
            <p className="text-xs text-white/35 mt-2">
              Phase 2: Microsoft Graph API für direkte Outlook-Entwürfe (optional, kommt später).
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-medium text-white/60 mb-3">Deployment</h2>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2">
            <a
              href="https://vercel.com/new"
              target="_blank"
              rel="noopener"
              className="flex items-center gap-2 text-xs text-[#6366f1] hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Auf Vercel deployen
            </a>
            <a
              href="https://console.anthropic.com"
              target="_blank"
              rel="noopener"
              className="flex items-center gap-2 text-xs text-[#6366f1] hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Anthropic Console → API Key
            </a>
            <a
              href="https://neon.tech"
              target="_blank"
              rel="noopener"
              className="flex items-center gap-2 text-xs text-[#6366f1] hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Neon PostgreSQL (kostenlos)
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
