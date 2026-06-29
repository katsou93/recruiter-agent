"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  Users,
  Building2,
  Kanban,
  Settings,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", icon: MessageSquare, label: "Agent Chat" },
  { href: "/candidates", icon: Users, label: "Kandidaten" },
  { href: "/companies", icon: Building2, label: "Unternehmen" },
  { href: "/pipeline", icon: Kanban, label: "Pipeline" },
  { href: "/settings", icon: Settings, label: "Einstellungen" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-16 md:w-56 flex flex-col border-r border-white/[0.06] bg-[#111111] shrink-0">
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-white/[0.06]">
        <Bot className="w-6 h-6 text-[#6366f1] shrink-0" />
        <span className="ml-3 font-semibold text-sm hidden md:block tracking-tight">
          RecruiterAgent
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                active
                  ? "bg-white/10 text-white"
                  : "text-white/50 hover:text-white/80 hover:bg-white/[0.05]"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="hidden md:block">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-3 px-2">
          <div className="w-7 h-7 rounded-full bg-[#6366f1]/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-medium text-[#6366f1]">P</span>
          </div>
          <div className="hidden md:block min-w-0">
            <p className="text-xs font-medium text-white/80 truncate">Personalberater</p>
            <p className="text-[11px] text-white/40 truncate">Privat</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
