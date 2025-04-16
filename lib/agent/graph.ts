import { AIMessage } from "@langchain/core/messages";
import { RunnableConfig } from "@langchain/core/runnables";
import { END, START, MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";

import { ConfigurationSchema, ensureConfiguration } from "../agent/configuration";
import { TOOLS } from "../agent/tools";
import { CLASSIFY_INTENT_PROMPT } from "../agent/prompt";

// Hàm phân loại intent từ user query
async function classifyIntent(config: RunnableConfig): Promise<string> {
  const userQuery = config?.configurable?.userQuery || "";
  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash",
    temperature: 0,
  });

  const prompt = CLASSIFY_INTENT_PROMPT.replace("{user_query}", userQuery);
  const response = await model.invoke([{ role: "user", content: prompt }]);
  const intent = typeof response.content === "string" ? response.content.trim().toLowerCase() : "general";
  return ["general", "database", "search"].includes(intent) ? intent : "general";
}

// Node xử lý intent
async function classify_intent_node(
  state: typeof MessagesAnnotation.State,
  config: RunnableConfig,
): Promise<typeof MessagesAnnotation.Update> {
  const intent = await classifyIntent(config);
  config.configurable = { ...config.configurable, intent };
  return { messages: [...state.messages] };
}

// Gọi model chính để trả lời người dùng
export async function callModel(
  state: typeof MessagesAnnotation.State,
  config: RunnableConfig,
): Promise<typeof MessagesAnnotation.Update> {
  const configuration = ensureConfiguration(config);
  const model = new ChatGoogleGenerativeAI({
    model: configuration.model,
    temperature: 0.7,
  }).bindTools(TOOLS);

  console.log("System prompt template:", configuration.systemPromptTemplate);

  const response = await model.invoke([
    {
      role: "system",
      content: configuration.systemPromptTemplate,
    },
    ...state.messages,
  ]);

  return { messages: [response] };
}

// Hàm quyết định chuyển hướng sau khi model trả lời
function routeModelOutput(state: typeof MessagesAnnotation.State): string {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1];
  if ((lastMessage as AIMessage)?.tool_calls?.length || 0 > 0) {
    return "tools";
  } else {
    return END;
  }
}

function routeByIntent(_: typeof MessagesAnnotation.State, config: RunnableConfig): string {
  const intent = config.configurable?.intent || "general";

  if (intent === "database" || intent === "search") {
    return "tools"; // Gọi công cụ tìm kiếm hoặc truy vấn DB
  }

  return "callModel"; // Ngược lại, xử lý bình thường bằng LLM
}


// Khởi tạo workflow chính
const workflow = new StateGraph(MessagesAnnotation, ConfigurationSchema)
  .addNode("classify_intent", classify_intent_node)
  .addNode("callModel", callModel)
  .addNode("tools", new ToolNode(TOOLS))
  .addEdge(START, "classify_intent")
  .addConditionalEdges("classify_intent", routeByIntent)
  .addConditionalEdges("callModel", routeModelOutput)
  .addEdge("tools", "callModel");


export const graph = workflow.compile({
  interruptBefore: [],
  interruptAfter: [],
});
