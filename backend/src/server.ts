import express from "express";
import cors from "cors";
import path from "path";
import multer from "multer";

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
app.post("/api/:caseId/chat", upload.single("file"), async (req, res) => {
  const { caseId } = req.params;
  const messages =
    typeof req.body.messages === "string"
      ? JSON.parse(req.body.messages)
      : req.body.messages;

  const userId = req.body.userId;
  const file = req.file ?? null;

  res.send(caseId);
});
app.get("/health", (_, res) => res.json({ status: "ok" }));

app.listen(Number(PORT), () => console.log(`Server running on port ${PORT}`));
