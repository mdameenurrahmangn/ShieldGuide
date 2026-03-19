import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";
import { User } from "./src/models/User.js";
import { Chat } from "./src/models/Chat.js";
import Groq from "groq-sdk";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/shieldguide";
const JWT_SECRET = process.env.JWT_SECRET || "shieldguide_secret";

const app = express();
app.use(express.json());

const groq = new Groq({ 
  apiKey: process.env.GROQ_API_KEY || ""
});

const SYSTEM_INSTRUCTION = `You are "ShieldGuide," an elite AI Safety Assistant integrated into a Tourism Safety application. Your primary mission is to ensure traveler security through proactive risk assessment and real-time guidance.

LOCATION PRIORITIZATION:
1. If the user explicitly mentions a specific place (e.g., "Tell me about safety in Paris" or "Is Times Square safe?"), prioritize that location.
2. If the user provides a Google Maps URL, you MUST NOT say "I cannot process URLs." Instead, look at the text of the URL to find a location name (e.g., "Paris", "Colosseum") or coordinates, and then use the googleMaps tool to analyze that area.
3. Use the provided GPS coordinates (in the [CONTEXT] prefix) ONLY if the user asks about "nearby," "here," or "where I am now," or if no other location is specified.
4. DO NOT ignore a user's manual input just because GPS data is available.

Operational Parameters:
1. Risk Detection: Analyze locations for "gray zones," known scam hotspots, or environmental hazards. Specifically look for:
   - Overcharging/Hidden Fees: Extra charges at restaurants, landmarks, or tour operators.
   - Transport Scams: Taxis or ride-shares taking unnecessarily long routes to inflate fares.
   - Tourist Traps: Aggressive street vendors or fake "closed" landmark scams.
   Use Google Maps and Google Search grounding to find the latest reports and community warnings about these specific issues.
2. Emergency Navigation: Instantly provide directions to the nearest verified Police Stations and Hospitals. 
3. Smart Routing: Recommend "Well-Lit" and "Populated" routes over the shortest path if the user is traveling at night. Detect and warn if a suggested route seems suspiciously long or indirect.
4. Cultural Intelligence: Explain local etiquette to prevent accidental disrespect or targeting.
5. Preference-Based Safety: Suggest verified, safe landmarks that align with user interests.

Response Guidelines:
- Tone: Calm, authoritative, and empathetic.
- Safety First: If a user says "I feel unsafe," immediately trigger emergency protocols (local emergency numbers) before providing further advice.
- Format: ALWAYS use standard Markdown for structure. 
  - Use **Bolding** for specific locations, landmarks, or key warnings.
  - Use Bulleted lists (using *) for all sets of suggestions, landmarks, or risk factors.
  - Do NOT just split text into lines; use proper list and paragraph structures.
  - If providing coordinates, format them clearly.`;

// Database connection state
let isConnected = false;

export const connectDb = async () => {
  const state = mongoose.connection.readyState;
  if (state === 1) return; // Already connected
  if (state === 2) {
    console.log("⏳ MongoDB connection is already in progress...");
    return;
  }
  
  console.log(`🔗 Connecting to MongoDB Atlas (State: ${state})...`);
  try {
    // Masked logging for URI verification
    const maskedUri = MONGODB_URI.replace(/\/\/.*@/, '//***:***@');
    console.log(`📡 URI: ${maskedUri}`);

    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 15000,
    });
    isConnected = true;
    console.log("✅ Connected to MongoDB");
    mongoose.set('bufferCommands', false);
  } catch (err: any) {
    console.error("❌ MongoDB connection error details:", {
      message: err.message,
      name: err.name,
      code: err.code
    });
    throw err;
  }
};

// Middleware to ensure database connection for API routes
const checkDb = async (req: any, res: any, next: any) => {
  try {
    await connectDb();
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database is not connected. Please wait a moment or check your connection settings."
      });
    }
    next();
  } catch (err: any) {
    res.status(503).json({ error: "Database connection failed: " + err.message });
  }
};

// Apply DB check to all API routes
app.use("/api/auth", checkDb);
app.use("/api/chat", checkDb);
app.use("/api/feedback", checkDb);

// API Routes
app.get("/api/health", async (req, res) => {
  const readyState = mongoose.connection.readyState;
  const statusMap = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({
    status: 'ok',
    database: statusMap[readyState] || 'unknown',
    readyState: readyState,
    mongodb_uri_set: !!process.env.MONGODB_URI,
    node_env: process.env.NODE_ENV
  });
});

app.post("/api/auth/register", async (req, res) => {
  const { name, email, phone, password } = req.body;
  try {
    const existingUser = await (User as any).findOne({ email });
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
    const user = await (User as any).findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    const messages = await (Chat as any).find({ userId: user._id }).sort({ timestamp: 1 });
    res.json({ success: true, messages });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/chat/generate", async (req, res) => {
  const { message, history, location } = req.body;
  const model = "llama-3.3-70b-versatile"; 
  
  const messages: any[] = [
    { role: 'system', content: SYSTEM_INSTRUCTION },
    ...history.map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content
    }))
  ];

  const locationContext = location 
    ? `[CONTEXT: User's CURRENT LIVE GPS location is ${location.latitude}, ${location.longitude}. Use this for "nearby" or "here" queries. HOWEVER, if the user explicitly mentions a different city, landmark, or provides a link/address for a specific place, prioritize that manually specified location for your analysis.]\n`
    : `[CONTEXT: User's live location is NOT available. Rely entirely on the landmarks or addresses provided in their message.]\n`;

  messages.push({
    role: 'user',
    content: locationContext + message
  });

  try {
    const response = await groq.chat.completions.create({
      model,
      messages,
      temperature: 0.5,
      max_tokens: 1024,
    });

    res.json({
      text: response.choices[0]?.message?.content || "I'm sorry, I couldn't process that request.",
      groundingMetadata: undefined
    });
  } catch (error: any) {
    console.error("API Error:", error);
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

// Global Error Handler (Keep at the bottom of API routes)
app.use((err: any, req: any, res: any, next: any) => {
  console.error("🔥 Global Server Error:", err.stack);
  res.status(500).json({
    error: "Internal Server Error",
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined
  });
});

export const startServer = async () => {
  const PORT = process.env.PORT || 3000;

  // Verify MONGODB_URI exists
  if (!process.env.MONGODB_URI && process.env.NODE_ENV === 'production') {
    console.error("🚨 CRITICAL: MONGODB_URI environment variable is not set!");
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite" as any);
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
