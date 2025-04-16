import { Annotation } from "@langchain/langgraph";
import { SYSTEM_PROMPT_TEMPLATE, DATABASE_SYSTEM_PROMPT, SEARCH_SYSTEM_PROMPT } from "./prompt";
import { RunnableConfig } from "@langchain/core/runnables";

/**
 * Define the configurable parameters for the agent.
 */
export const ConfigurationSchema = Annotation.Root({
  /**
   * The system prompt to be used by the agent.
   */
  systemPromptTemplate: Annotation<string>,

  /**
   * The name of the language model to be used by the agent.
   */
  model: Annotation<string>,
});

/**
 * Helper function to get the correct XML prompt template based on user intent.
 */
export function getPromptTemplate(intent: string): string {
  switch (intent) {
    case "database":
      return DATABASE_SYSTEM_PROMPT;
    case "search":
      return SEARCH_SYSTEM_PROMPT;
    default:
      return SYSTEM_PROMPT_TEMPLATE;
  }
}

export function ensureConfiguration(config: RunnableConfig): typeof ConfigurationSchema.State {
  const configurable = config.configurable || {};
  const intent = configurable.intent || "general";
  const promptTemplate = getPromptTemplate(intent);

  return {
    systemPromptTemplate: configurable.systemPromptTemplate ?? promptTemplate,
    model: configurable.model ?? "gemini-2.0-flash",
  };
}
