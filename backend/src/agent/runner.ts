import { BaseAgent, InMemoryRunner } from "@google/adk";

export async function getRunner(agent: BaseAgent): Promise<InMemoryRunner> {
  return new InMemoryRunner({ agent, appName: "notis" });
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
