import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { RunnableConfig } from "@langchain/core/runnables";
import { END, START, MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { getPromptTemplate } from "../agent/configuration"; // đảm bảo bạn export hàm này từ configuration.ts

import { ConfigurationSchema, ensureConfiguration } from "../agent/configuration";
import { TOOLS } from "../agent/tools";
import { CLASSIFY_INTENT_PROMPT } from "../agent/prompt";

// Hàm phân loại intent từ user query
async function classifyIntent(
  state: typeof MessagesAnnotation.State,
  config: RunnableConfig
): Promise<string> {
  const userMessages = state.messages.filter((msg: any) => msg.constructor.name === "HumanMessage");
  const lastUserMessage = userMessages[userMessages.length - 1];

  const userQuery =
  typeof lastUserMessage?.content === "string"
    ? lastUserMessage.content
    : lastUserMessage?.content?.toString?.() ?? "";

  console.log(">>> USER_QUERY:", userQuery);

  if (!userQuery) {
    console.warn("⚠️ No user query found in state.messages");
  }

  const model = new ChatGoogleGenerativeAI({
    model: config.configurable?.model || "gemini-2.0-flash",
    temperature: 0,
  });

  const prompt = CLASSIFY_INTENT_PROMPT.replace("{user_query}", userQuery);
  const response = await model.invoke([{ role: "user", content: prompt }]);

  const rawContent = typeof response.content === "string"
    ? response.content
    : (response.content as any)?.text ?? "";

  const match = rawContent.match(/<intent>(.*?)<\/intent>/i);
  const intent = match?.[1]?.toLowerCase() ?? "general";

  console.log(">>> CLASSIFIED_INTENT:", intent);
  console.log(">>> PROMPT:", prompt.slice(0, 200));
  console.log(">>> RAW_CONTENT:", rawContent.slice(0, 200));

  return ["general", "database", "search"].includes(intent) ? intent : "general";
}

// Node xử lý intent
async function classify_intent_node(
  state: typeof MessagesAnnotation.State,
  config: RunnableConfig,
): Promise<typeof MessagesAnnotation.Update> {
  const intent = await classifyIntent(state, config); // Lấy từ LLM
  const systemPromptTemplate = getPromptTemplate(intent); // Ánh xạ prompt theo intent

  console.log(">>> SYSTEM_PROMPT_TEMPLATE (first 200 chars):", systemPromptTemplate.slice(0, 200));

  // Cập nhật intent và systemPromptTemplate
  config.configurable = {
    ...config.configurable,
    intent,
    systemPromptTemplate, // Gán prompt tương ứng để callModel dùng
  };

  return { messages: [...state.messages] };
}

export async function callModel(
  state: typeof MessagesAnnotation.State,
  config: RunnableConfig,
): Promise<typeof MessagesAnnotation.Update> {
  const systemPromptTemplate = config.configurable?.systemPromptTemplate;
  const model = new ChatGoogleGenerativeAI({
    model: config.configurable?.model || "gemini-2.0-flash",
    temperature: 0.7,
  }).bindTools(TOOLS);

  console.log(">>> CALLING MODEL WITH PROMPT:", systemPromptTemplate ? systemPromptTemplate.slice(0, 200) : "No systemPromptTemplate available");

  const response = await model.invoke([
    {
      role: "system",
      content: systemPromptTemplate,
    },
    ...state.messages,
  ]);

  return { messages: [response] };
}

// Hàm định tuyến sau khi model trả lời
function routeModelOutput(state: typeof MessagesAnnotation.State): string {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1];
  if ((lastMessage as AIMessage)?.tool_calls?.length || 0 > 0) {
    return "tools";
  } else {
    return END;
  }
}



// Khởi tạo workflow chính
const workflow = new StateGraph(MessagesAnnotation, ConfigurationSchema)
  .addNode("classify_intent", classify_intent_node)
  .addNode("callModel", callModel)
  .addNode("tools", new ToolNode(TOOLS))
  .addEdge(START, "classify_intent")  // Bắt đầu từ classify_intent
  .addEdge("classify_intent", "callModel") // Chỉ gọi callModel sau khi classify_intent xong
  .addConditionalEdges("callModel", routeModelOutput) // quyết định gọi tool hay kết thúc
  .addEdge("tools", "callModel"); // quay lại model sau khi gọi tool



export const graph = workflow.compile({
  interruptBefore: [],
  interruptAfter: [],
});
