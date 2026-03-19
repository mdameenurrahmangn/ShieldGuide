export default async function handler(req: any, res: any) {
  try {
    // Dynamically loading the server file with .js extension 
    // This is the most reliable way for ESM + TypeScript on Vercel
    const { default: app } = await import('../server.js');
    
    // Pass the request to Express
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
