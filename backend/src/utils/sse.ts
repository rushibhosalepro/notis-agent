import type { Response } from "express";
import type { SSEEvent } from "../types";

export function send(res: Response, event: SSEEvent) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}
