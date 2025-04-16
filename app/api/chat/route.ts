import { graph } from "@/lib/agent/graph";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("👉 Received messages:", body.messages); // DEBUG LOG

    const result = await graph.invoke({
      messages: body.messages,
    });

    console.log("🧠 Agent response:", result); // DEBUG LOG

    return NextResponse.json({ messages: result.messages });
  } catch (err) {
    console.error("❌ Error in route.ts:", err); // Catch unexpected errors
    return NextResponse.json(
      { error: "Server error when processing chat" },
      { status: 500 }
    );
  }
}
