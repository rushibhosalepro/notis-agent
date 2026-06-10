import { ObjectId } from "mongodb";
import type {
  CaseStatus,
  DraftResponse,
  Message,
  NoticeDetails,
} from "../../types";
import { casesCol } from "./mongodb";

export async function getMessages(args: {
  caseId: string;
}): Promise<Message[]> {
  const col = await casesCol();
  const c = await col.findOne(
    { caseId: args.caseId },
    { projection: { messages: 1, _id: 0 } },
  );
  return c?.messages ?? [];
}

export async function updateCaseStatus(args: {
  caseId: string;
  status: CaseStatus;
  event: string;
  noticeDetails?: Partial<NoticeDetails>;
  agentNotes?: string[];
}): Promise<string> {
  const col = await casesCol();

  const update: Record<string, unknown> = {
    status: args.status,
    updatedAt: new Date(),
  };

  if (args.noticeDetails) {
    Object.entries(args.noticeDetails).forEach(([k, v]) => {
      update[`noticeDetails.${k}`] = v;
    });
  }

  const notesToPush = [
    `[${new Date().toISOString()}] ${args.event}`,
    ...(args.agentNotes ?? []),
  ];

  await col.updateOne(
    { caseId: args.caseId },
    {
      $set: update,
      $push: {
        agentNotes: { $each: notesToPush },
      } as any,
    },
  );

  console.log(`[MongoDB] Case ${args.caseId} → ${args.status}: ${args.event}`);
  return JSON.stringify({
    success: true,
    caseId: args.caseId,
    status: args.status,
  });
}

export async function saveDraftResponse(args: {
  caseId: string;
  content: string;
}): Promise<string> {
  const col = await casesCol();

  const draft: DraftResponse = {
    _id: new ObjectId(),
    draftId: `draft-${new ObjectId().toHexString()}`,
    content: args.content,
    generatedAt: new Date(),
    status: "DRAFT",
  };

  await col.updateOne(
    { caseId: args.caseId },
    {
      $push: { drafts: draft } as any,
      $set: { status: "DRAFTING", updatedAt: new Date() },
    },
  );

  console.log(`[MongoDB] Draft saved for case ${args.caseId}`);
  return JSON.stringify({ success: true, draftId: draft.draftId });
}

export async function getCase(args: { caseId: string }): Promise<string> {
  const col = await casesCol();
  const c = await col.findOne(
    { caseId: args.caseId },
    {
      projection: {
        caseId: 1,
        userId: 1,
        status: 1,
        noticeDetails: 1,
        agentNotes: 1,
        drafts: { $slice: -1 },
        createdAt: 1,
        updatedAt: 1,
      },
    },
  );

  if (!c) return JSON.stringify({ error: `Case ${args.caseId} not found` });
  return JSON.stringify(c);
}

export async function setFirstMessageFileName(args: {
  caseId: string;
  fileName: string;
}): Promise<void> {
  const col = await casesCol();
  await col.updateOne(
    { caseId: args.caseId },
    { $set: { "messages.0.fileName": args.fileName } },
  );
}

export async function appendMessage(args: {
  caseId: string;
  role: "user" | "assistant";
  content: string;
  fileName?: string;
}): Promise<string> {
  const col = await casesCol();

  const message: Message = {
    _id: new ObjectId(),
    messageId: `msg-${new ObjectId().toHexString()}`,
    role: args.role,
    content: args.content,
    ...(args.fileName ? { fileName: args.fileName } : {}),
    createdAt: new Date(),
  };

  await col.updateOne(
    { caseId: args.caseId },
    {
      $push: { messages: message } as any,
      $set: { updatedAt: new Date() },
    },
  );

  return JSON.stringify({ success: true, messageId: message.messageId });
}
