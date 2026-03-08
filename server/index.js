import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';

const app = express();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MODEL = "gemini-2.5-flash";

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// --- Multer disk storage ---

function makeStorage(subfolder) {
  const dest = path.join("uploads", subfolder);
  fs.mkdirSync(dest, { recursive: true });

  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dest),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      const name = crypto.randomUUID() + ext;
      cb(null, name);
    },
  });
}

const uploadImage = multer({ storage: makeStorage("images") });
const uploadDocument = multer({ storage: makeStorage("documents") });
const uploadAudio = multer({ storage: makeStorage("audio") });

// --- System Instructions ---

const SYSTEM = `You are "Konsultan Kegalauan", a friendly AI assistant that helps users think clearly before making decisions.

IDENTITY:
- Your name is "Konsultan Kegalauan". NEVER use any other name.
- You are calm, thoughtful, insightful, friendly, and slightly witty.

LANGUAGE:
- ALWAYS respond in Bahasa Indonesia.
- Never respond in English unless the user explicitly asks.

OUTPUT FORMAT:
- Split your response into multiple short chat messages.
- Separate each message with exactly this delimiter on its own line: ---
- Each message must be 1-3 sentences maximum.
- Every message must be grammatically complete.
- NEVER stop mid-sentence, mid-bullet, or mid-word.

CONVERSATION FLOW:
Message 1: Natural reaction to the user's situation (1 sentence).
---
Message 2: **Situasi** — summarize the dilemma (1-2 sentences).
---
Message 3: ✨ **Opsi A** with bullet Pro and Kontra.
---
Message 4: 🚀 **Opsi B** with bullet Pro and Kontra.
---
Message 5: 💡 **Rekomendasi** — clear recommendation with reasoning (1-2 sentences).

DECISION RULES:
- If user gives 2 options: compare them.
- If user gives more than 2 options: analyze each, then rank.
- If user gives fewer than 2 options, respond with exactly:
"Coba ceritakan minimal dua pilihan yang sedang kamu pertimbangkan supaya aku bisa membantu menganalisisnya."
(This message does NOT need the --- delimiter.)

FORMATTING RULES:
- Use **bold** for section labels.
- Use • for Pro and Kontra bullets.
- Use numbered lists only for rankings.
- Do NOT use markdown headings (# or ##).
- Maximum 1 emoji icon per section (✨ 🚀 💡).

CRITICAL RULE — COMPLETE RESPONSES:
- Your total response must be COMPLETE.
- Every section must be fully finished before the response ends.
- The **Rekomendasi** section MUST always be present.
- If you are running out of space, shorten your analysis but ALWAYS include the recommendation.
- Maximum 200 words total.`;

// --- Generation configs ---

const chatConfig = {
  temperature: 0.6,
  topP: 0.9,
  topK: 40,
  maxOutputTokens: 2048,
};

const fileConfig = {
  temperature: 0.7,
  maxOutputTokens: 2048,
};

// --- Helpers ---

// Robust message splitter — handles various --- formats
function splitMessages(fullText) {
  if (!fullText || fullText.trim().length === 0) {
    return [];
  }

  // Split on --- with flexible whitespace around it
  const parts = fullText
    .split(/\n\s*---\s*\n/)
    .map((m) => m.trim())
    .filter((m) => m.length > 0);

  // Fallback: if split produced nothing useful, return full text as one message
  if (parts.length === 0) {
    return [fullText.trim()];
  }

  return parts;
}

// Read file from disk and return base64 + mimetype
function readFileAsBase64(filePath, mimetype) {
  const buffer = fs.readFileSync(filePath);
  return {
    data: buffer.toString("base64"),
    mimeType: mimetype,
  };
}

// Build attachment metadata for response
function buildAttachment(file, subfolder) {
  return {
    type: subfolder.replace(/s$/, ""), // "images" -> "image"
    url: `/uploads/${subfolder}/${file.filename}`,
    filename: file.filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
  };
}

// Parse conversation JSON from FormData field
function parseConversation(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// --- Routes ---

// POST /api/chat — multi-turn text conversation
app.post("/api/chat", async (req, res) => {
  try {
    const { conversation } = req.body;

    if (!Array.isArray(conversation) || conversation.length === 0) {
      return res.status(400).json({ message: "Array conversation diperlukan." });
    }

    const contents = conversation.map((msg) => ({
      role: msg.role === "model" ? "model" : "user",
      parts: [{ text: msg.text }],
    }));

    const response = await ai.models.generateContent({
      model: MODEL,
      config: { ...chatConfig, systemInstruction: SYSTEM },
      contents,
    });

    const fullText = response.text || "";
    const messages = splitMessages(fullText);

    res.status(200).json({ result: fullText, messages });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Generic file upload handler with conversation memory
async function handleFileUpload(req, res, subfolder, defaultPrompt) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "File diperlukan." });
    }

    const prompt = req.body.prompt || defaultPrompt;
    const priorConversation = parseConversation(req.body.conversation);
    const fileData = readFileAsBase64(req.file.path, req.file.mimetype);
    const attachment = buildAttachment(req.file, subfolder);

    // Build contents: prior conversation + current file message
    const contents = priorConversation.map((msg) => ({
      role: msg.role === "model" ? "model" : "user",
      parts: [{ text: msg.text }],
    }));

    // Add current user message with file
    contents.push({
      role: "user",
      parts: [
        { text: prompt },
        { inlineData: fileData },
      ],
    });

    const response = await ai.models.generateContent({
      model: MODEL,
      config: { ...fileConfig, systemInstruction: SYSTEM },
      contents,
    });

    const fullText = response.text || "";
    const messages = splitMessages(fullText);

    res.status(200).json({ result: fullText, messages, attachment });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

// POST /generate-from-image
app.post("/generate-from-image", uploadImage.single("image"), (req, res) => {
  handleFileUpload(req, res, "images", "Analisis gambar ini dan bantu aku mengambil keputusan. Jawab dalam Bahasa Indonesia.");
});

// POST /generate-from-document
app.post("/generate-from-document", uploadDocument.single("document"), (req, res) => {
  handleFileUpload(req, res, "documents", "Analisis dokumen ini dan bantu aku mengambil keputusan. Jawab dalam Bahasa Indonesia.");
});

// POST /generate-from-audio
app.post("/generate-from-audio", uploadAudio.single("audio"), (req, res) => {
  handleFileUpload(req, res, "audio", "Transkripsikan dan analisis audio ini. Jawab dalam Bahasa Indonesia.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server ready on http://localhost:${PORT}`));
