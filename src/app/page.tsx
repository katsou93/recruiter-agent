"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRef, useEffect, useState } from "react";
import { Send, Bot, User, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { ToolCallIndicator } from "@/components/agent/tool-indicator";
import { QuickActions } from "@/components/agent/quick-actions";

export default function ChatPage() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [inputText, setInputText] = useState("");

  const { messages, sendMessage, stop, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || isLoading) return;
    sendMessage({ text });
    setInputText("");
    if (inputRef.current) inputRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (prompt: string) => {
    setInputText(prompt);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-14 flex items-center px-5 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            "w-2 h-2 rounded-full transition-colors",
            isLoading ? "bg-amber-400 animate-pulse" : "bg-emerald-400"
          )} />
          <span className="text-sm font-medium text-white/80">
            {isLoading ? "Agent arbeitet..." : "Agent bereit"}
          </span>
        </div>
        <div className="ml-auto text-xs text-white/30">claude-sonnet-4-6 · Personalberater</div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-8 text-center px-4">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-[#6366f1]/10 border border-[#6366f1]/20 flex items-center justify-center mx-auto mb-4">
                <Bot className="w-7 h-7 text-[#6366f1]" />
              </div>
              <h1 className="text-xl font-semibold text-white mb-2">
                Hallo! Ich bin dein Recruiting-Agent.
              </h1>
              <p className="text-white/40 text-sm max-w-md">
                Ich helfe dir Kandidaten zu verwalten, Anschreiben zu erstellen
                und deine Pipeline im Blick zu behalten.
              </p>
            </div>
            <QuickActions onSelect={handleQuickAction} />
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id}>
              {msg.role === "user" && (
                <div className="flex gap-3 justify-end">
                  <div className="max-w-[75%] bg-[#6366f1] text-white px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm leading-relaxed">
                    {msg.parts
                      .filter((p) => p.type === "text")
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      .map((p: any, i: number) => <span key={i}>{p.text}</span>)}
                  </div>
                  <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-white/60" />
                  </div>
                </div>
              )}

              {msg.role === "assistant" && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#6366f1]/10 border border-[#6366f1]/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-[#6366f1]" />
                  </div>
                  <div className="flex-1 max-w-[85%] space-y-1.5">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {(msg.parts as any[]).map((part, i: number) => {
                      if (typeof part.type === "string" && part.type.startsWith("tool-")) {
                        const toolName = part.type.slice(5);
                        return (
                          <ToolCallIndicator
                            key={i}
                            toolName={toolName}
                            state={part.state}
                            output={part.output}
                          />
                        );
                      }
                      if (part.type === "text" && part.text) {
                        return (
                          <div
                            key={i}
                            className="text-sm text-white/85 leading-relaxed whitespace-pre-wrap bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-tl-sm px-4 py-3"
                          >
                            {part.text}
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-[#6366f1]/10 border border-[#6366f1]/20 flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-[#6366f1]" />
            </div>
            <div className="flex items-center gap-1.5 px-4 py-3 bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-tl-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-white/[0.06] shrink-0">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Schreib mir eine Aufgabe... (Enter senden, Shift+Enter neue Zeile)"
            rows={1}
            className="w-full bg-white/[0.06] border border-white/[0.08] rounded-2xl px-4 py-3 pr-16 text-sm text-white placeholder:text-white/30 resize-none focus:outline-none focus:border-[#6366f1]/50 focus:bg-white/[0.08] transition-colors min-h-[48px] max-h-[200px] overflow-y-auto"
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 200) + "px";
            }}
          />
          <div className="absolute right-3 bottom-2.5 flex items-center gap-2">
            {isLoading ? (
              <button
                type="button"
                onClick={stop}
                className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
                title="Stoppen"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                disabled={!inputText.trim()}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  inputText.trim()
                    ? "bg-[#6366f1] hover:bg-[#5558e8] text-white"
                    : "bg-white/5 text-white/20 cursor-not-allowed"
                )}
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <p className="text-center text-xs text-white/20 mt-2">
          Anschreiben werden als Entwurf gespeichert – du versendest sie manuell über Outlook.
        </p>
      </div>
    </div>
  );
}
