import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { charterId, task } = await request.json();

  const stream = new ReadableStream({
    start(controller) {
      const messages = [
        "[Agent] Querying The Graph for Charter #" + (charterId || "demo") + "...",
        "[Agent] Charter valid. Remaining: 49.998 HBAR | Reputation: 0/100",
        "[Agent] Discovering inference services via The Graph...",
        "[Agent] Found 1 service: MANDATE Inference Service (rep: 94, 0.002 HBAR/query)",
        "[Agent] Received 402. Required: 0.002 HBAR",
        "[Agent] Payment signed on Hedera...",
        "[Agent] Payment settled in 2.8s. TX: 0xdemo...",
        "[Agent] HCS execution logged for Charter #" + (charterId || "demo"),
        "[Agent] === TASK COMPLETE ===",
        `Result: Completed task: ${task || "Research the current state of AI agent payment protocols"}`
      ];

      let index = 0;
      const interval = setInterval(() => {
        if (index >= messages.length) {
          clearInterval(interval);
          controller.close();
          return;
        }

        const chunk = `data: ${messages[index]}\n\n`;
        controller.enqueue(new TextEncoder().encode(chunk));
        index += 1;
      }, 500);
    }
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
