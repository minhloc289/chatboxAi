import { Intent, IntentAnnotation, IntentAnnotationType } from "./state";
import { AIMessage, HumanMessage } from "@langchain/core/messages";

import { z } from "zod";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {
  END,
  START,
  MessagesAnnotation,
  StateGraph,
} from "@langchain/langgraph";
import {
  CLASSIFY_INTENT_PROMPT,
  SYSTEM_PROMPT_TEMPLATE,
  DATABASE_SYSTEM_PROMPT,
} from "./prompt";
import { TOOLS } from "../agent/tools";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import "dotenv/config";

const intentSchema = z.object({
  query: z.string().describe("The user query or input to classify the intent"),
  intentType: z
    .enum([Intent.Database, Intent.General, Intent.Search])
    .describe("The type of intent"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Confidence level of the classification, from 0 to 1"),
  responseType: z
    .string()
    .optional()
    .describe("The type of response, e.g., 'text', 'action', etc."),
});

async function classifyIntent(
  state: typeof IntentAnnotation.State
): Promise<typeof IntentAnnotation.Update> {
  console.log("Graph's state in node classifyIntent:", state);

  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash",
    temperature: 0,
  }).withStructuredOutput(intentSchema); // Bind the structured output schema

  const lastMessage = state.messages[state.messages.length - 1].content;

  const prompt = CLASSIFY_INTENT_PROMPT.replace(
    "{user_query}",
    lastMessage as string
  );
  const response = await model.invoke([{ role: "user", content: prompt }]);
  const classifiedIntent = response.intentType;

  console.log(">>> CLASSIFIED_INTENT:", classifiedIntent);

  return {
    intent: classifiedIntent,
  };
}

function routeModelOutput(state: typeof MessagesAnnotation.State): string {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1];
  if ((lastMessage as AIMessage)?.tool_calls?.length || 0 > 0) {
    return "tools";
  } else {
    return END;
  }
}

async function callModel(
  state: typeof IntentAnnotation.State
): Promise<typeof IntentAnnotation.Update> {
  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash",
    temperature: 0.7,
  }).bindTools(TOOLS); // Bind the tools to the model

  let promptTemplate = "";
  const intent = state.intent; // Get the intent from the state

  switch (intent) {
    case "database":
      promptTemplate = DATABASE_SYSTEM_PROMPT;
      break;
    case "general":
      promptTemplate = SYSTEM_PROMPT_TEMPLATE;
      break;
    case "search":
      promptTemplate = SYSTEM_PROMPT_TEMPLATE;
      break;
    default:
      promptTemplate = SYSTEM_PROMPT_TEMPLATE;
  }

  const response = await model.invoke([
    {
      role: "system",
      content: promptTemplate,
    },
    ...state.messages,
  ]);

  return {
    messages: [...state.messages, response],
  };
}

function routeIntent(state: IntentAnnotationType): string {
  console.log("Route Intent:", state.intent);
  if (state.intent === Intent.Database) {
    return "node_a";
  }
  if (state.intent === Intent.General) {
    return "node_b";
  }
  if (state.intent === Intent.Search) {
    return "node_c";
  }
  return "node_b";
}

const workflow = new StateGraph(IntentAnnotation)
  .addNode("classify_intent", classifyIntent)
  .addNode("callModel", callModel)
  .addNode("tools", new ToolNode(TOOLS))
  .addEdge(START, "classify_intent")
  .addEdge("classify_intent", "callModel")
  .addConditionalEdges("callModel", routeModelOutput)
  .addEdge("tools", "callModel");

export const graph = workflow.compile();
