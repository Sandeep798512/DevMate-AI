const mongoose = require("mongoose");

// ── Single message inside a chat ──────────────────────────────────────────────
const messageSchema = new mongoose.Schema({
  role:    { type: String, enum: ["user", "ai"], required: true },
  content: { type: String, required: true },
  tool:    { type: String, default: "ask" },
}, { _id: false, timestamps: { createdAt: true, updatedAt: false } });

// ── Chat document ─────────────────────────────────────────────────────────────
const chatSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "User",
      required: true,
      index: true,
    },
    title:    { type: String, default: "New Chat", maxlength: 100 },
    tool:     { type: String, default: "ask" },
    isPinned: { type: Boolean, default: false },
    messages: { type: [messageSchema], default: [] },
  },
  { timestamps: true }
);

// ── Indexes for fast queries ───────────────────────────────────────────────────
chatSchema.index({ user: 1, updatedAt: -1 });
chatSchema.index({ user: 1, title: "text", "messages.content": "text" });

module.exports = mongoose.model("Chat", chatSchema);
