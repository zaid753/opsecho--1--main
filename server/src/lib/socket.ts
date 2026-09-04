import { Server } from "socket.io";
import http from "http";
import jwt from "jsonwebtoken";
import { processTranscript } from "../services/aiProcessor";

const JWT_SECRET = process.env.JWT_SECRET || "default_secret_for_dev_only";

export const initSocket = (server: http.Server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication error"));

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      (socket as any).user = decoded;
      next();
    } catch (err) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    const user = (socket as any).user;
    console.log(`[Socket] User connected: ${user.id}`);

    socket.on("join-incident", (incidentId: string) => {
      socket.join(`incident:${incidentId}`);
      console.log(`[Socket] User ${user.id} joined incident room: ${incidentId}`);
    });

    socket.on("leave-incident", (incidentId: string) => {
      socket.leave(`incident:${incidentId}`);
      console.log(`[Socket] User ${user.id} left incident room: ${incidentId}`);
    });

    socket.on("transcript:send", async ({ incidentId, text }: { incidentId: string; text: string }) => {
      await processTranscript(io, socket, incidentId, text, user.name, user.id);
    });

    socket.on("disconnect", () => {
      console.log(`[Socket] User disconnected: ${user.id}`);
    });
  });

  return io;
};
