import { streamText, isStepCount, toUIMessageStream, createUIMessageStreamResponse, convertToModelMessages } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { allTools } from "@/lib/agent-tools";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: allTools,
    stopWhen: isStepCount(8),
  });

  const uiStream = toUIMessageStream({
    stream: result.fullStream,
    tools: allTools,
  });

  return createUIMessageStreamResponse({ stream: uiStream });
  } catch (error) {
    console.error("Agent error:", error);
    return new Response(
      JSON.stringify({ error: "Agent-Fehler. Bitte nochmal versuchen." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
      );
  }
}
