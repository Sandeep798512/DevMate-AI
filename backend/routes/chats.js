/**
 * DevMate AI — routes/chats.js
 * Chat Management: create, list, load, rename, delete, search, save messages
 * All routes require JWT via protect middleware (applied in server.js)
 */

const express = require("express");
const router  = express.Router();
const crypto  = require("crypto");
// const Chat    = require("../models/Chat");
const Chat = require("../models/chat");
const SharedChat = require("../models/SharedChat");

// ── Helper: get token from request ────────────────────────────────────────────
function getUserId(req) {
  return req.user?._id;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/chats
// List all chats for current user, sorted by updatedAt desc
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", async (req, res, next) => {
  try {
    const chats = await Chat.find({ user: getUserId(req) })
      .select("title tool createdAt updatedAt messages")
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean();

    // Send only metadata (not full messages) for sidebar listing
    const list = chats.map(c => ({
      _id:       c._id,
      title:     c.title,
      tool:      c.tool,
      preview:   c.messages?.at(-1)?.content?.substring(0, 80) || "",
      count:     c.messages?.length || 0,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    res.json({ chats: list });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/chats
// Create a new empty chat
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", async (req, res, next) => {
  try {
    const { title, tool } = req.body;
    const chat = await Chat.create({
      user:  getUserId(req),
      title: title || "New Chat",
      tool:  tool  || "ask",
    });
    res.status(201).json({ chat });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/chats/search?q=keyword
// Search chats by title or message content
// ─────────────────────────────────────────────────────────────────────────────
router.get("/search", async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json({ chats: [] });

    const userId = getUserId(req);
    const regex  = new RegExp(q, "i");

    const chats = await Chat.find({
      user: userId,
      $or: [
        { title: regex },
        { "messages.content": regex },
      ],
    })
      .select("title tool createdAt updatedAt messages")
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean();

    const list = chats.map(c => ({
      _id:       c._id,
      title:     c.title,
      tool:      c.tool,
      preview:   c.messages?.at(-1)?.content?.substring(0, 80) || "",
      count:     c.messages?.length || 0,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    res.json({ chats: list });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/chats/:id
// Load a single chat with all messages
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:id", async (req, res, next) => {
  try {
    const chat = await Chat.findOne({
      _id:  req.params.id,
      user: getUserId(req),
    }).lean();

    if (!chat) return res.status(404).json({ error: "Chat not found." });
    res.json({ chat });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/chats/:id/messages
// Add user + AI messages to a chat (called after AI responds)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/:id/messages", async (req, res, next) => {
  try {
    const { userMessage, aiMessage, tool } = req.body;

    if (!userMessage || !aiMessage) {
      return res.status(400).json({ error: "userMessage and aiMessage are required." });
    }

    const chat = await Chat.findOne({ _id: req.params.id, user: getUserId(req) });
    if (!chat) return res.status(404).json({ error: "Chat not found." });

    // Push both messages
    chat.messages.push({ role: "user", content: userMessage, tool: tool || "ask" });
    chat.messages.push({ role: "ai",   content: aiMessage,   tool: tool || "ask" });

    // Auto-generate title from first user message if still "New Chat"
    if (chat.title === "New Chat") {
      chat.title = userMessage.substring(0, 60).trim() + (userMessage.length > 60 ? "…" : "");
    }

    await chat.save();
    res.json({ chat });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/chats/:id
// Rename a chat
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/:id", async (req, res, next) => {
  try {
    const update = {};
    if (req.body.title !== undefined) {
      if (!req.body.title.trim()) {
        return res.status(400).json({ error: "Title is required." });
      }
      update.title = req.body.title.trim().substring(0, 100);
    }
    if (req.body.isPinned !== undefined) {
      update.isPinned = !!req.body.isPinned;
    }

    const chat = await Chat.findOneAndUpdate(
      { _id: req.params.id, user: getUserId(req) },
      update,
      { new: true }
    ).lean();

    if (!chat) return res.status(404).json({ error: "Chat not found." });
    res.json({ chat });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/chats/:id
// Delete a chat permanently
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/:id", async (req, res, next) => {
  try {
    const chat = await Chat.findOneAndDelete({
      _id:  req.params.id,
      user: getUserId(req),
    });
    if (!chat) return res.status(404).json({ error: "Chat not found." });
    res.json({ message: "Chat deleted successfully." });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/chats
// Delete ALL chats for current user
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/", async (req, res, next) => {
  try {
    await Chat.deleteMany({ user: getUserId(req) });
    res.json({ message: "All chats deleted." });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/chats/:id/share
// Save a snapshot of the current conversation and return a unique shareId
// ─────────────────────────────────────────────────────────────────────────────
router.post("/:id/share", async (req, res, next) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.id, user: getUserId(req) });
    if (!chat) return res.status(404).json({ error: "Chat not found." });

    const shareId = crypto.randomBytes(8).toString("hex");

    await SharedChat.create({
      shareId,
      title: chat.title,
      messages: chat.messages.map(m => ({
        role: m.role,
        content: m.content,
        tool: m.tool,
        createdAt: m.createdAt
      }))
    });

    res.status(201).json({ shareId });
  } catch (err) { next(err); }
});

module.exports = router;
