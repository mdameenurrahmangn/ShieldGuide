import app from '../server';

export default async function handler(req: any, res: any) {
  try {
    // Standard Express app execution within a Vercel serverless function
    return app(req, res);
  } catch (err: any) {
    console.error("🚨 Vercel Runtime Crash:", err);
    res.status(500).json({ 
      error: "Runtime Crash during initialization",
      message: err.message,
      stack: err.stack,
      nodeVersion: process.version,
      env: process.env.NODE_ENV
    });
  }
}
