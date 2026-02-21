export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  pipelineSteps?: { label: string; content: string; type: string }[];
}

export interface Conversation {
  id: string;
  title: string;
  messages?: Message[];
  model?: "gemini" | "claude";
  createdAt: Date;
}
