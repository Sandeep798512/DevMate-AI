const express = require("express");
const router  = express.Router();
const SharedChat = require("../models/SharedChat");

// GET /api/share/:shareId
router.get("/:shareId", async (req, res, next) => {
  try {
    const sharedChat = await SharedChat.findOne({ shareId: req.params.shareId });
    if (!sharedChat) {
      return res.status(404).json({ error: "Shared chat not found." });
    }
    res.json({ sharedChat });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
