import express from "express";
import { createServer as createViteServer } from "vite";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";
import { User } from "./src/models/User.js";
import { Chat } from "./src/models/Chat.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/shieldguide";
const JWT_SECRET = process.env.JWT_SECRET || "shieldguide_secret";

const app = express();

export const startServer = async () => {
  const PORT = process.env.PORT || 3000;

  // Middleware to check database connection for API routes
  const checkDb = (req: any, res: any, next: any) => {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database is not connected. Please wait a moment or check your connection settings."
      });
    }
    next();
  };

  app.use(express.json());

  // Connect to MongoDB
  console.log("🔗 Connecting to MongoDB Atlas...");
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
    console.log("✅ Connected to MongoDB");
  } catch (err: any) {
    console.error("❌ MongoDB connection error:", err.message);
  }

  // Disable buffering so that queries fail fast if DB is not connected
  mongoose.set('bufferCommands', false);

  // Apply DB check to all API routes except health
  app.use("/api/auth", checkDb);
  app.use("/api/chat", checkDb);
  app.use("/api/feedback", checkDb);

  // API Routes
  app.get("/api/health", async (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.json({
      status: 'ok',
      database: dbStatus,
      mongodb_uri: MONGODB_URI.replace(/\/\/.*@/, '//***:***@') // Mask credentials if any
    });
  });

  app.post("/api/auth/register", async (req, res) => {
    const { name, email, phone, password } = req.body;
    try {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({
        name,
        email,
        phone,
        password: hashedPassword
      });

      await user.save();

      const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ success: true, token, user: { name, email, phone } });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ error: "Invalid credentials" });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ success: true, token, user: { name: user.name, email: user.email, phone: user.phone } });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/chat/:email", async (req, res) => {
    const { email } = req.params;
    try {
      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ error: "User not found" });

      const messages = await Chat.find({ userId: user._id }).sort({ timestamp: 1 });
      res.json({ success: true, messages });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/chat", async (req, res) => {
    const { email, role, content, timestamp, groundingMetadata } = req.body;
    try {
      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ error: "User not found" });

      const chat = new Chat({
        userId: user._id,
        role,
        content,
        timestamp,
        groundingMetadata
      });

      await chat.save();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/feedback", async (req, res) => {
    const { email, type, message } = req.body;
    try {
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  // Only listen if not in a serverless environment
  if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }

  return app;
};

// Auto-start for local execution
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  startServer().catch(err => {
    console.error("Failed to start server:", err);
  });
}

export default app;
