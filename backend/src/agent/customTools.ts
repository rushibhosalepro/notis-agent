import { FunctionTool } from "@google/adk";
import z from "zod";
import * as fs from "node:fs";
import { GoogleGenAI } from "@google/genai";
import type { AgentContext } from "../types";

// export const manualToolSchema: GoogleToolSchema[] = [
//   {
//     functionDeclarations: [
//       {
//         name: "analyze_file",
//         description:
//           "Analyze an uploaded GST notice image or PDF and extract structured information",
//         parameters: {
//           type: Type.OBJECT,
//           properties: {},
//           required: [],
//         },
//       },
//       {
//         name: "ask_user",
//         description:
//           "Ask the user a clarifying question with predefined options when critical information is missing. Only use when you cannot reasonably infer the answer. Ask ONE question at a time.",
//         parameters: {
//           type: Type.OBJECT,
//           properties: {
//             question: {
//               type: Type.STRING,
//               description: "The clarifying question to show the user.",
//             },
//             options: {
//               type: Type.ARRAY,
//               items: { type: Type.STRING },
//               description:
//                 "2-4 short answer options for the user to pick from.",
//             },
//           },
//           required: ["question", "options"],
//         },
//       },
//     ],
//   },
// ];

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
            model: "gemini-2.5-flash",
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
  ];
};
