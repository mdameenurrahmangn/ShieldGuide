export default async function handler(req: any, res: any) {
  try {
    // Correctly import the server file (Vercel builds TS automatically)
    // Using extension-less path ensures it works in both development and production
    const { default: app } = await import('../server');
    
    // Express apps can be called as (req, res) directly in serverless functions
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
