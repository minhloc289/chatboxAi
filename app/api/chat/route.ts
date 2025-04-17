import { graph } from "@/lib/agent/agent"; // Import graph từ agent
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json(); // Lấy dữ liệu JSON từ yêu cầu

    // Kiểm tra nếu không có thông điệp nào trong body
    if (!body.messages || body.messages.length === 0) {
      return NextResponse.json(
        { error: "No messages received" },
        { status: 400 }
      );
    }

    // Gửi các thông điệp vào graph để xử lý và nhận phản hồi
    const result = await graph.invoke({
      messages: body.messages, // Truyền các thông điệp nhận được vào graph
    });

    // Trả về kết quả dưới dạng JSON chứa các thông điệp phản hồi
    return NextResponse.json({ messages: result.messages });
  } catch (err) {
    // Bắt lỗi và trả về thông báo lỗi cho phía client
    console.error("❌ Error in route.ts:", err); // Catch unexpected errors
    return NextResponse.json(
      { error: "Server error when processing chat" },
      { status: 500 }
    );
  }
}
