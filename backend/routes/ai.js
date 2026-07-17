/**
 * AI Routes — DevMate AI v3
 * These routes are protected by JWT (via protect middleware in server.js).
 * All endpoints remain the same as v2 — only auth layer added.
 */

const express = require("express");
const router  = express.Router();
const { validate } = require("../middleware/errorHandler");

// ── Lazy-load aiService (graceful if Gemini key missing) ─────────────────────
let aiService;
try {
  aiService = require("../utils/aiService");
} catch {
  console.warn("⚠️  aiService not found — AI endpoints will return demo responses");
  aiService = null;
}

function demoResponse(tool) {
  return `## Demo Mode\n\nAdd your \`GEMINI_API_KEY\` to \`.env\` to get real AI responses for **${tool}**.\n\n\`\`\`bash\nGEMINI_API_KEY=your_key_here\n\`\`\``;
}

const handle = (fn, toolName) => async (req, res, next) => {
  try {
    const answer = aiService ? await fn(req) : demoResponse(toolName);
    res.json({ answer });
  } catch (err) { next(err); }
};

// ── Endpoints (same paths as v2) ──────────────────────────────────────────────

router.post("/explain",     validate(["code"]),     handle(r => aiService.explainCode(r.body.code, r.body.history),    "explain"));
router.post("/detect-bugs", validate(["code"]),     handle(r => aiService.detectBugs(r.body.code, r.body.history),     "detect-bugs"));
router.post("/optimize",    validate(["code"]),     handle(r => aiService.optimizeCode(r.body.code, r.body.history),   "optimize"));
router.post("/review",      validate(["code"]),     handle(r => aiService.reviewCode(r.body.code, r.body.history),     "review"));
router.post("/summarize",   validate(["code"]),     handle(r => aiService.summarizeCode(r.body.code, r.body.history),  "summarize"));
router.post("/readme",      validate(["code"]),     handle(r => aiService.generateReadme(r.body.code, r.body.history), "readme"));
router.post("/ask",         validate(["question"]), handle(r => aiService.askQuestion(r.body.question, r.body.history), "ask"));

// Extra tools (if available)
if (aiService) {
  router.post("/complexity", validate(["code"]), handle(r => aiService.analyzeComplexity?.(r.body.code) || aiService.explainCode(r.body.code, r.body.history), "complexity"));
  router.post("/security",   validate(["code"]), handle(r => aiService.analyzeSecurity?.(r.body.code)  || aiService.reviewCode(r.body.code, r.body.history),  "security"));
  router.post("/interview",  validate(["code"]), handle(r => aiService.generateInterviewQ?.(r.body.code) || aiService.explainCode(r.body.code, r.body.history), "interview"));
  router.post("/commit",     validate(["code"]), handle(r => aiService.generateCommit?.(r.body.code)   || aiService.summarizeCode(r.body.code, r.body.history), "commit"));
  router.post("/docs",       validate(["code"]), handle(r => aiService.generateDocs?.(r.body.code)     || aiService.explainCode(r.body.code, r.body.history),  "docs"));
}

module.exports = router;
