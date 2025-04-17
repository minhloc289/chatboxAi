import { BaseMessage } from "@langchain/core/messages";
import { Annotation, MessagesAnnotation } from "@langchain/langgraph";

export enum Intent {
  General = "general",
  Database = "database",
  Search = "search",
}

export const IntentAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
  intent: Annotation<Intent>,
});

export type IntentAnnotationType = typeof IntentAnnotation.State;
