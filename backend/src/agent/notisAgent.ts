import { LlmAgent } from "@google/adk";
import type { AgentContext } from "../types";
import { createElasticMCPToolset } from "../utils/mcp";
import { createCustomTools } from "./customTools";
import { SYSTEM_PROMPT } from "./prompt";

import { ThinkingLevel } from "@google/genai";
const elasticToolset = createElasticMCPToolset();

// export const notisAgent = new LlmAgent({
//   name: "notis_gst_agent",
//   model: process.env.GEMINI_MODEL,
//   description:
//     "AI GST Compliance Agent — reads GST notices, searches Indian tax law, and drafts legally-grounded response letters.",
//   instruction: SYSTEM_PROMPT,
//   tools: [elasticToolset, ...CustomTools],

//   generateContentConfig: {
//     thinkingConfig: {
//       includeThoughts: true,
//       thinkingLevel: ThinkingLevel.MEDIUM,
//     },
//   },
// });

export function createNotisAgent({
  caseId,
  userId,
  file,
}: {
  caseId: string;
  userId: string;
  file: Express.Multer.File | null;
}) {
  const tools = createCustomTools({ file, caseId, userId });
  console.log(
    `reciving this file on createNoticeAgent`,
    caseId,
    userId,
    file?.path,
  );

  return new LlmAgent({
    name: "notis_gst_agent",
    model: process.env.GEMINI_MODEL,
    description:
      "AI GST Compliance Agent — reads GST notices, searches Indian tax law, and drafts legally-grounded response letters.",
    instruction: SYSTEM_PROMPT,
    tools: [elasticToolset, ...tools],

    generateContentConfig: {
      thinkingConfig: {
        includeThoughts: true,
        thinkingLevel: ThinkingLevel.MEDIUM,
      },
    },
  });
}
