const express = require("express");
const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");
const os      = require("os");
const router  = express.Router();

// ── Optional parsers ──────────────────────────────────────────────────────────
let pdfParse = null;
let mammoth  = null;
try { pdfParse = require("pdf-parse"); } catch { pdfParse = null; }
try { mammoth  = require("mammoth");  } catch { mammoth  = null; }

// ── File type sets ────────────────────────────────────────────────────────────
const TEXT_EXTS = new Set([
  ".js", ".ts", ".jsx", ".tsx",
  ".py", ".java", ".cpp", ".c", ".cs",
  ".html", ".css", ".scss", ".json",
  ".md", ".txt", ".sql", ".go", ".rs",
  ".php", ".rb", ".sh", ".yaml", ".yml", ".xml",
]);

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const DOC_EXTS   = new Set([".pdf", ".docx"]);
const ALL_EXTS   = new Set([...TEXT_EXTS, ...IMAGE_EXTS, ...DOC_EXTS]);

const IMAGE_MIME = {
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif":  "image/gif",
};

// ── Upload directory ──────────────────────────────────────────────────────────
const uploadDir = path.join(os.tmpdir(), "devmate-uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const MAX_MB = parseInt(process.env.MAX_FILE_SIZE_MB || "10", 10);

// ── Multer config ─────────────────────────────────────────────────────────────
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      cb(null, unique + path.extname(file.originalname).toLowerCase());
    },
  }),
  limits: { fileSize: MAX_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALL_EXTS.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error(
        `File type "${ext}" is not supported. ` +
        `Allowed: code files, .pdf, .docx, .txt, .md, .png, .jpg, .jpeg, .webp`
      ));
    }
  },
});

// ── Cleanup helper ────────────────────────────────────────────────────────────
function cleanup(fp) {
  try { if (fp && fs.existsSync(fp)) fs.unlinkSync(fp); } catch { /* ignore */ }
}

// ── Content extractor ─────────────────────────────────────────────────────────
async function extractContent(filePath, ext) {
  // Plain text / code
  if (TEXT_EXTS.has(ext)) {
    const content = fs.readFileSync(filePath, "utf-8");
    if (!content.trim()) throw new Error("File is empty.");
    return { type: "text", content };
  }

  // PDF
  if (ext === ".pdf") {
    if (!pdfParse) {
      throw new Error("PDF support requires 'pdf-parse'. Run: npm install pdf-parse");
    }
    const buffer  = fs.readFileSync(filePath);
    const parsed  = await pdfParse(buffer);
    const content = (parsed.text || "").trim();
    if (!content) throw new Error("PDF has no extractable text (may be a scanned/image PDF).");
    return { type: "text", content };
  }

  // DOCX
  if (ext === ".docx") {
    if (!mammoth) {
      throw new Error("DOCX support requires 'mammoth'. Run: npm install mammoth");
    }
    const result  = await mammoth.extractRawText({ path: filePath });
    const content = (result.value || "").trim();
    if (!content) throw new Error("DOCX file appears to be empty.");
    return { type: "text", content };
  }

  // Images
  if (IMAGE_EXTS.has(ext)) {
    const base64   = fs.readFileSync(filePath).toString("base64");
    const mimeType = IMAGE_MIME[ext] || "image/jpeg";
    return { type: "image", base64, mimeType };
  }

  throw new Error(`Unsupported file type: ${ext}`);
}

// ── POST /api/upload ──────────────────────────────────────────────────────────
router.post("/", upload.single("file"), async (req, res, next) => {

  // Multer error (wrong file type, too large)
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded." });
  }

  const fp     = req.file.path;
  const ext    = path.extname(req.file.originalname).toLowerCase();
  const action = (req.body.action || "explain").toLowerCase();
  const prompt = req.body.prompt || "";
  
  let history = [];
  if (req.body.history) {
    try {
      history = typeof req.body.history === "string" ? JSON.parse(req.body.history) : req.body.history;
    } catch (e) {
      history = [];
    }
  }

  console.log(`[Upload] file=${req.file.originalname} ext=${ext} action=${action} promptLength=${prompt.length} historyLength=${history.length}`);

  try {
    // Step 1: Extract content
    const extracted = await extractContent(fp, ext);

    // Step 2: Load aiService
    const aiService = require("../utils/aiService");

    let answer;

    // Step 3: Route to correct AI function
    if (extracted.type === "image") {
      // Images go to vision model
      if (typeof aiService.analyzeImage !== "function") {
        throw new Error("analyzeImage function not found in aiService. Please add it.");
      }
      const imagePrompt = prompt || aiService.IMAGE_PROMPTS[action] || aiService.IMAGE_PROMPTS.explain;
      answer = await aiService.analyzeImage(extracted.base64, extracted.mimeType, action, imagePrompt, history);
    } else {
      // Text/code/doc
      const { content } = extracted;
      if (prompt) {
        // Construct combined prompt context with custom user question
        const promptText = `${prompt}\n\n[Attached File: ${req.file.originalname}]\n\`\`\`\n${content}\n\`\`\``;
        answer = await aiService.askQuestion(promptText, history);
      } else {
        // Fall back to default actions, passing history
        switch (action) {
          case "explain":   answer = await aiService.explainCode(content, history);   break;
          case "summarize": answer = await aiService.summarizeCode(content, history); break;
          case "review":    answer = await aiService.reviewCode(content, history);    break;
          case "bugs":      answer = await aiService.detectBugs(content, history);    break;
          case "optimize":  answer = await aiService.optimizeCode(content, history);  break;
          default:          answer = await aiService.explainCode(content, history);   break;
        }
      }
    }

    // Step 4: Cleanup and respond
    cleanup(fp);
    console.log(`[Upload] Success — ${req.file.originalname}`);
    return res.json({
      answer,
      filename: req.file.originalname,
      size: req.file.size,
      content: extracted.type === "text" ? extracted.content : undefined
    });

  } catch (err) {
    cleanup(fp);
    console.error(`[Upload] Error — ${err.message}`);

    // File size error from multer
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: `File too large. Max ${MAX_MB}MB allowed.` });
    }

    // Pass to global error handler which sends JSON response
    return next(err);
  }
});

module.exports = router;
