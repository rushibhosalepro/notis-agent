import { LlmAgent } from "@google/adk";
import { createElasticMCPToolset } from "../utils/mcp";
import { SYSTEM_PROMPT } from "./prompt";

const elasticToolset = createElasticMCPToolset();

export const notisAgent = new LlmAgent({
  name: "notis_gst_agent",
  model: process.env.GEMINI_MODEL,
  description:
    "AI GST Compliance Agent — reads GST notices, searches Indian tax law, and drafts legally-grounded response letters.",
  instruction: SYSTEM_PROMPT,
  tools: [elasticToolset],
});
