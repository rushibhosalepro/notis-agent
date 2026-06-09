import type { Response } from "express";
import type { Content } from "@google/genai";
import type { AgentContext, Message } from "../types";
import { BaseAgent, StreamingMode } from "@google/adk";
import { getRunner, ensureSessionExists } from "./runner";
import { send } from "../utils/sse";

const buildNewMessage = (
  message: Message,
  fileInstruction: string,
): Content => {
  let text = message.content;
  if (fileInstruction && message.role === "user") {
    text += `\n\n[Context] ${fileInstruction}`;
  }

  return {
    role: message.role === "user" ? "user" : "model",
    parts: [{ text }],
  };
};

export async function runAgent(
  context: AgentContext,
  messages: Message[],
  res: Response,
  agent: BaseAgent,
) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const file = context.file;
  const fileInstruction = file
    ? `User has uploaded a file: ${file.originalname}`
    : "";

  const latestMessage = messages[messages.length - 1];
  if (!latestMessage) {
    send(res, { type: "done" });
    return res.end();
  }

  const newMessage = buildNewMessage(latestMessage, fileInstruction);
  const runner = await getRunner(agent);

  await ensureSessionExists(runner, context.caseId, context.userId);

  try {
    const eventStream = runner.runAsync({
      userId: context.userId,
      sessionId: context.caseId,
      newMessage: newMessage,
      runConfig: {
        streamingMode: StreamingMode.SSE,
      },
    });

    for await (const event of eventStream) {
      const parts = event.content?.parts || [];

      for (const part of parts) {
        if (!part) continue;

        if (part.thought && part.text) {
          send(res, { type: "thinking", text: part.text });
          continue;
        }

        if (part.functionCall) {
          const { name, id, args } = part.functionCall;

          if (name === "ask_user" || name === "promptUser") {
            send(res, {
              type: "ask_user",
              id: id ?? "",
              question: (args?.question as string) ?? "",
              options: (args?.options as string[]) ?? [],
            });
          } else {
            send(res, {
              type: "tool_call",
              id: id ?? "",
              name: name ?? "",
              input: (args as Record<string, unknown>) ?? {},
            });
          }
          continue;
        }

        if (part.functionResponse) {
          const { name, id, response } = part.functionResponse;
          const isError =
            response && typeof response === "object" && "error" in response;

          send(res, {
            type: "tool_result",
            id: id ?? "",
            name: name ?? "",
            result:
              typeof response === "string"
                ? response
                : JSON.stringify(response ?? ""),
            status: isError ? "error" : "done",
          });
          continue;
        }

        if (part.text) {
          send(res, { type: "text", text: part.text });
        }
      }
    }

    send(res, { type: "done" });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(error);
    send(res, { type: "error", message: errorMessage });
    send(res, { type: "done" });
  } finally {
    res.end();
  }
}
