import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("shieldguide.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/auth/register", (req, res) => {
    const { name, email, phone } = req.body;
    try {
      const stmt = db.prepare("INSERT INTO users (name, email, phone) VALUES (?, ?, ?)");
      stmt.run(name, email, phone);
      res.json({ success: true, user: { name, email, phone } });
    } catch (error: any) {
      if (error.message.includes("UNIQUE constraint failed")) {
        // If user exists, just return the user info (simulating login)
        const user = db.prepare("SELECT name, email, phone FROM users WHERE email = ?").get(email);
        res.json({ success: true, user });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  app.post("/api/feedback", (req, res) => {
    const { email, type, message } = req.body;
    try {
      const stmt = db.prepare("INSERT INTO feedback (user_email, type, message) VALUES (?, ?, ?)");
      stmt.run(email, type, message);
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
