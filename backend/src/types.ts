export type Role = "user" | "assistant";

export type AgentContext = {
  userId: string;
  caseId: string;
  file: Express.Multer.File | null;
};

export interface Message {
  messageId: string;
  role: Role;
  content: string;
  createdAt: Date;
}

export type SSEEvent =
  | { type: "thinking"; text: string }
  | {
      type: "tool_call";
      id: string;
      name: string;
      input: Record<string, unknown>;
    }
  | {
      type: "tool_result";
      id: string;
      name: string;
      result: string;
      status: "done" | "error";
    }
  | { type: "ask_user"; id: string; question: string; options: string[] }
  | { type: "text"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };
