import { InMemoryRunner } from "@google/adk";
import { notisAgent } from "./notisAgent";
let _runner: InMemoryRunner | null = null;

export async function getRunner(): Promise<InMemoryRunner> {
  if (_runner) return _runner;

  _runner = new InMemoryRunner({ agent: notisAgent, appName: "notis" });
  return _runner;
}

export async function ensureSessionExists(
  runner: InMemoryRunner,
  sessionId: string,
  userId: string,
): Promise<void> {
  const existingSession = await runner.sessionService.getSession({
    appName: "notis",
    userId,
    sessionId,
  });

  if (!existingSession) {
    await runner.sessionService.createSession({
      appName: "notis",
      userId,
      sessionId,
    });
  }
}
