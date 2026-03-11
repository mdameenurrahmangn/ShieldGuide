export default async function handler(req: any, res: any) {
  try {
    // Attempt to load the main app
    const { default: app } = await import('../server.js');
    // If it's an Express app, it can handle (req, res)
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
