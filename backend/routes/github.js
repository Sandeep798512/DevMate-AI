const express = require("express");
const router  = express.Router();

router.post("/analyze", async (req, res, next) => {
  try {
    const { repoUrl } = req.body;
    if (!repoUrl?.includes("github.com"))
      return res.status(400).json({ error: "Please provide a valid GitHub repository URL." });

    let contextManager, aiService;
    try {
      contextManager = require("../utils/contextManager");
      aiService      = require("../utils/aiService");
    } catch {
      return res.json({ answer: "## Demo Mode\n\nGitHub analysis requires `contextManager` and `aiService` in `utils/`." });
    }

    const repoData = await contextManager.getGitHubContext(repoUrl.trim());
    const answer   = await aiService.analyzeGitHub(repoData);
    res.json({ answer });
  } catch (err) {
    if (err.message && !err.status) err.status = 422;
    next(err);
  }
});

module.exports = router;
