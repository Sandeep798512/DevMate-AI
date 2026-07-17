const mongoose = require("mongoose");

let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn("⚠️  MONGODB_URI not set — running in demo mode (auth disabled)");
    return;
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    isConnected = true;
    console.log("✅ MongoDB Atlas connected");
  } catch (err) {
    console.error("❌ MongoDB failed:", err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
