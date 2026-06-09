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
