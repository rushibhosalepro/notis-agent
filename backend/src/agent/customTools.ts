import { FunctionTool } from "@google/adk";
import z from "zod";
import * as fs from "node:fs";
import { GoogleGenAI } from "@google/genai";
import type { AgentContext } from "../types";
import {
  appendMessage,
  getCase,
  saveDraftResponse,
  updateCaseStatus,
} from "../utils/database/functions";

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export const createCustomTools = (context: AgentContext) => {
  return [
    new FunctionTool({
      name: "analyze_file",
      description:
        "Analyze an uploaded GST notice image or PDF and extract structured information",
      parameters: z.object({}),
      execute: async () => {
        const { file } = context;

        if (!file?.path) return JSON.stringify({ error: "File not found" });
        const base64 = fs.readFileSync(file?.path, { encoding: "base64" });
        const mimeType = file.mimetype as
          | "image/jpeg"
          | "image/png"
          | "application/pdf";

        try {
          const response = await ai.models.generateContent({
            // model: "gemini-2.5-flash",
            model: process.env.GEMINI_MODEL!,
            contents: [
              { inlineData: { data: base64, mimeType } },
              {
                text: `You are a GST document analyzer. Extract all relevant information 
      from this GST notice and return a JSON object with these fields if present:
      noticeType, arnNumber, gstin, demandAmount, taxPeriod, reason, dueDate, issuedBy,state
      Return ONLY valid JSON, no explanation.`,
              },
            ],
          });

          return (
            response.text ?? JSON.stringify({ error: "no response from model" })
          );
        } catch (error) {
          return JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          });
        }
      },
    }),

    new FunctionTool({
      name: "update_case_status",
      description:
        "Updates the status of the current case and logs a timeline event. " +
        "Valid transitions: ANALYZING → DOCS_NEEDED → DRAFTING → SUBMITTED → CLOSED. " +
        "Also use to persist extracted notice details (noticeType, demandAmount, arnNumber, etc.).",
      parameters: z.object({
        status: z
          .enum(["ANALYZING", "DOCS_NEEDED", "DRAFTING", "SUBMITTED", "CLOSED"])
          .describe(
            "New status. Never use OPEN — that is set at case creation.",
          ),
        event: z
          .string()
          .describe(
            "Short description of what happened, e.g. 'Extracted demand amount ₹84,320 from ASMT-10 notice'.",
          ),
        noticeDetails: z
          .object({
            noticeType: z
              .enum([
                "ASMT-10",
                "DRC-01",
                "DRC-03",
                "GSTR-2A_MISMATCH",
                "SCN",
                "OTHER",
              ])
              .optional(),
            arnNumber: z.string().optional(),
            demandAmount: z.number().optional(),
            gstin: z.string().optional(),
            sections: z.array(z.string()).optional(),
            dueDate: z
              .string()
              .optional()
              .describe("ISO 8601 date string e.g. '2025-03-31T00:00:00.000Z'"),
          })
          .optional()
          .describe(
            "Partial notice fields to merge — only include what you extracted.",
          ),
        agentNotes: z
          .array(z.string())
          .optional()
          .describe(
            "Internal notes not shown to the user. Each item is one observation, " +
              "e.g. ['ITC mismatch found', 'Section 73 likely applicable'].",
          ),
      }),
      execute: async (params) => {
        const result = await updateCaseStatus({
          caseId: context.caseId,
          status: params.status as any,
          event: params.event,
          noticeDetails: params.noticeDetails as any,
          agentNotes: params.agentNotes,
        });
        return JSON.parse(result);
      },
    }),
    new FunctionTool({
      name: "save_draft_response",
      description:
        "Saves a completed draft response letter to the current case. " +
        "Only call when the full letter is ready — it will be shown to the user for review.",
      parameters: z.object({
        content: z
          .string()
          .describe(
            "Full text of the official GST response letter including " +
              "reference number, subject line, body, and signature block.",
          ),
      }),
      execute: async ({ content }) => {
        const result = await saveDraftResponse({
          caseId: context.caseId,
          content,
        });
        return JSON.parse(result);
      },
    }),
    new FunctionTool({
      name: "get_case",
      description:
        "Fetches the current case — status, notice details, agent notes, latest draft. " +
        "Use at the start of a new turn to recall prior state.",
      parameters: z.object({}),
      execute: async () => {
        const result = await getCase({ caseId: context.caseId });
        return JSON.parse(result);
      },
    }),
    new FunctionTool({
      name: "append_message",
      description: "Append a message to the case conversation history.",
      parameters: z.object({
        role: z
          .enum(["user", "assistant"])
          .describe("Message sender: user or assistant"),
        content: z.string().describe("Message content"),
      }),
      execute: async ({ role, content }) => {
        const result = await appendMessage({
          caseId: context.caseId,
          role,
          content,
        });
        return JSON.parse(result);
      },
    }),

    new FunctionTool({
      name: "ask_user_quetion",
      description:
        "Ask the user a clarifying question with predefined options when critical information is missing. Only use when you cannot reasonably infer the answer. Ask ONE question at a time.",
      parameters: z.object({
        quetions: z.array(
          z.object({
            quetion: z
              .string()
              .describe("The clarifying question to show the user."),
            options: z.array(
              z
                .string()
                .describe(
                  "2-4 short answer options for the user to pick from.",
                ),
            ),
            type: z.enum(["multiple_choice", "single_choice"]),
          }),
        ),
      }),
      execute: () => {},
    }),
  ];
};
