const mongoose = require("mongoose");

const sharedChatSchema = new mongoose.Schema(
  {
    shareId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: { type: String, required: true },
    messages: [
      {
        role: { type: String, required: true },
        content: { type: String, required: true },
        tool: { type: String },
        createdAt: { type: Date }
      }
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("SharedChat", sharedChatSchema);
