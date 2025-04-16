"use client";
import React from "react";
import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

const chatbox = () => {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>(
    []
  );
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsSending(true);

    try {
      // Chuyển đổi định dạng tin nhắn thành dạng LangChain message
      const formattedMessages = updatedMessages
        .map((msg) => {
          if (msg.role === "user") {
            return {
              lc: 1,
              type: "constructor",
              id: ["langchain_core", "messages", "HumanMessage"],
              kwargs: { content: msg.content },
            };
          } else if (msg.role === "ai") {
            return {
              lc: 1,
              type: "constructor",
              id: ["langchain_core", "messages", "AIMessage"],
              kwargs: { content: msg.content },
            };
          }
          return null;
        })
        .filter(Boolean);

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: formattedMessages,
          userQuery: input,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("API response error:", errorData);
        throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();

      // Kiểm tra xem response có dữ liệu hay không
      if (data.messages && data.messages.length > 0) {
        // Tìm tin nhắn AI mới nhất trong dữ liệu trả về
        const aiMessages = data.messages.filter(
          (msg: any) => msg.type === "constructor" && msg.id[2] === "AIMessage"
        );

        if (aiMessages.length > 0) {
          // Lấy tin nhắn AI cuối cùng trong danh sách
          const latestAiMessage = aiMessages[aiMessages.length - 1];
          const aiContent = latestAiMessage.kwargs.content;
          setMessages((prev) => [...prev, { role: "ai", content: aiContent }]);
        } else {
          setMessages((prev) => [
            ...prev,
            { role: "ai", content: "Không có phản hồi từ AI." },
          ]);
        }
      } else {
        throw new Error("No messages received from API.");
      }
    } catch (error) {
      console.error("Error during request:", error);
      const errorMsg = {
        role: "ai",
        content: "Xin lỗi, đã xảy ra lỗi khi xử lý yêu cầu của bạn.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = "40px";
      textAreaRef.current.style.height = `${Math.min(
        textAreaRef.current.scrollHeight,
        100
      )}px`;
    }
  }, [input]);

  // Scroll to bottom when new messages arrive
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  return (
    <div className="flex flex-col h-[600px] w-[500px] mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 m-10">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center">
        <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white shadow-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
        </div>
        <div className="ml-3">
          <h2 className="text-xl font-bold text-white">Mr AI</h2>
          <p className="text-xs text-white/80">Trợ lý thông minh</p>
        </div>
        <div className="ml-auto">
          <div className="w-3 h-3 bg-green-400 rounded-full shadow animate-pulse"></div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mb-2 opacity-50"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
              <line x1="9" y1="9" x2="9.01" y2="9"></line>
              <line x1="15" y1="9" x2="15.01" y2="9"></line>
            </svg>
            <p className="text-center max-w-xs">
              Hãy bắt đầu cuộc trò chuyện bằng cách đặt câu hỏi!
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                } animate-fade-in`}
                style={{
                  animationDelay: `${idx * 0.1}s`,
                  opacity: 1,
                }}
              >
                {msg.role !== "user" && (
                  <div
                    className="flex-shrink-0 w-8 h-8 rounded-full mr-2 overflow-hidden"
                    style={{ backgroundColor: "#8B5CF6" }}
                  >
                    <div className="flex items-center justify-center h-full text-white text-xs font-bold">
                      AI
                    </div>
                  </div>
                )}
                <div
                  className={`max-w-xs md:max-w-md p-3 rounded-2xl shadow-sm transition-all duration-300 ease-in-out break-words ${
                    msg.role === "user"
                      ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-none"
                      : "bg-white text-gray-800 rounded-bl-none border border-gray-100"
                  }`}
                >
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
                {msg.role === "user" && (
                  <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white ml-2 shadow-md">
                    <span className="text-xs font-bold">YOU</span>
                  </div>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start animate-fade-in">
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-full mr-2 overflow-hidden"
                  style={{ backgroundColor: "#8B5CF6" }}
                >
                  <div className="flex items-center justify-center h-full text-white text-xs font-bold">
                    AI
                  </div>
                </div>
                <div className="bg-white p-4 rounded-2xl rounded-bl-none shadow-sm border border-gray-100">
                  <div className="flex space-x-1">
                    <div
                      className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"
                      style={{ animationDelay: "0s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"
                      style={{ animationDelay: "0.4s" }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100">
        <div className="flex items-center bg-gray-50 rounded-xl p-1 shadow-sm border border-gray-200 focus-within:ring-2 focus-within:ring-indigo-200 focus-within:border-transparent transition-all duration-300">
          <textarea
            ref={textAreaRef}
            className="flex-1 p-2 bg-transparent border-none focus:outline-none resize-none text-gray-700 max-h-[100px]"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Nhập câu hỏi..."
            rows={1}
            disabled={isSending}
          />
          <button
            onClick={handleSend}
            disabled={isSending || !input.trim()}
            className={`ml-1 p-3 rounded-xl transition-all duration-300 flex items-center justify-center ${
              input.trim() && !isSending
                ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {isSending ? (
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            )}
          </button>
        </div>
        <div className="text-xs text-gray-400 mt-2 text-center">
          Nhấn Enter để gửi • Shift + Enter để xuống dòng
        </div>
      </div>
    </div>
  );
};

export default chatbox;
