import express from "express";
import cors from "cors";
import path from "path";
import multer from "multer";
import { runAgent } from "./agent/runAgent";
import { createNotisAgent } from "./agent/notisAgent";
import { ObjectId } from "mongodb";
import type { Case, Message } from "./types";
import { casesCol } from "./utils/database/mongodb";
import { appendMessage, getMessages } from "./utils/database/functions";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

const upload = multer({
  dest: path.join(process.cwd(), "tmp/uploads"),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10mb
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    allowed.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Invalid file type"));
  },
});

app.post("/api/case/start", async (req, res) => {
  try {
    const { prompt, userId } = req.body;
    if (!prompt)
      return res.status(400).json({ ok: false, error: "prompt is required" });
    if (!userId)
      return res.status(400).json({ ok: false, error: "userId is required" });

    const now = new Date();
    const caseId = new ObjectId().toHexString();

    const firstMessage: Message = {
      _id: new ObjectId(),
      messageId: `msg-${new ObjectId().toHexString()}`,
      role: "user",
      content: prompt,
      createdAt: now,
    };

    const newCase: Case = {
      _id: new ObjectId(),
      caseId,
      userId,
      messages: [firstMessage],
      status: "OPEN",
      files: [],
      drafts: [],
      agentNotes: [],
      createdAt: now,
      updatedAt: now,
    };

    await (await casesCol()).insertOne(newCase);
    return res.status(201).json({ ok: true, caseId, case: newCase });
  } catch (err) {
    console.error("Failed to start case:", err);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});
app.get("/api/:caseId/messages", async (req, res) => {
  const { caseId } = req.params;
  if (!caseId || Array.isArray(caseId)) {
    return res.status(400).json({ ok: false, error: "caseId must be a string" });
  }
  try {
    const msgs = await getMessages({ caseId });
    return res.json(msgs);
  } catch (err) {
    console.error("Failed to fetch messages:", err);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

app.post("/api/:caseId/chat", upload.single("file"), async (req, res) => {
  const { caseId } = req.params;
  const messages =
    typeof req.body.messages === "string"
      ? JSON.parse(req.body.messages)
      : req.body.messages;

  const userId = req.body.userId;
  const file = req.file ?? null;

  if (!messages || !Array.isArray(messages)) {
    return res
      .status(400)
      .json({ ok: false, error: "messages array is required" });
  }

  if (!caseId || Array.isArray(caseId)) {
    return res
      .status(400)
      .json({ ok: false, error: "caseId must be a string" });
  }

  // Save new user message — skip if length === 1 (first message already saved at case creation)
  const latestMsg = messages[messages.length - 1];
  if (messages.length > 1 && latestMsg?.role === "user") {
    await appendMessage({ caseId, role: "user", content: latestMsg.content });
  }

  const noticeAgent = createNotisAgent({ caseId, userId, file });
  await runAgent({ caseId, file, userId }, messages, res, noticeAgent);
});
app.get("/health", (_, res) => res.json({ status: "ok" }));

app.listen(Number(PORT), () => console.log(`Server running on port ${PORT}`));
