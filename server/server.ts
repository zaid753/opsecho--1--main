import express from "express";
import path from "path";
import http from "http";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./src/routes/auth";
import incidentRoutes from "./src/routes/incidents";
import agoraRoutes from "./src/routes/agora";
import integrationsRoutes from "./src/routes/integrations";
import { initSocket } from "./src/lib/socket";

dotenv.config();

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = initSocket(server);
  
  // Make io available to routes if needed
  app.set("io", io);

  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/incidents", incidentRoutes);
  app.use("/api/agora", agoraRoutes);
  app.use("/api/integrations", integrationsRoutes);
  
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "opsecho-api" });
  });

  // Vite Middleware for Development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[OpsEcho] Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("[OpsEcho] Failed to start server:", err);
});
