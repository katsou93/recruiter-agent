"use client";

interface QuickAction {
  label: string;
  prompt: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "📊 Pipeline-Übersicht",
    prompt: "Zeig mir eine Übersicht meiner aktuellen Pipeline",
  },
  {
    label: "👤 Kandidat eintragen",
    prompt: "Ich möchte einen neuen Kandidaten anlegen",
  },
  {
    label: "🏢 Unternehmen anlegen",
    prompt: "Ich möchte ein neues Unternehmen in die Datenbank eintragen",
  },
  {
    label: "✉️ Anschreiben erstellen",
    prompt: "Erstelle mir einen Anschreiben-Entwurf für einen Kandidaten",
  },
  {
    label: "🔍 Kandidaten suchen",
    prompt: "Suche mir geeignete Kandidaten",
  },
];

interface QuickActionsProps {
  onSelect: (prompt: string) => void;
}

export function QuickActions({ onSelect }: QuickActionsProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {QUICK_ACTIONS.map((action) => (
        <button
          key={action.label}
          onClick={() => onSelect(action.prompt)}
          className="px-3.5 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white/60 hover:text-white/90 hover:bg-white/[0.07] hover:border-white/15 transition-all duration-150"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
