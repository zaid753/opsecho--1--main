import { Server, Socket } from "socket.io";
import http from "http";
import jwt from "jsonwebtoken";
import { processTranscript } from "../services/aiProcessor";
import prisma from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET || "default_secret_for_dev_only";

export const initSocket = (server: http.Server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication error"));

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      // Fetch full user from DB to get the name (since JWT only has id and role)
      const user = await prisma.user.findUnique({ where: { id: decoded.id } });
      
      if (!user) return next(new Error("User not found"));
      
      (socket as any).user = user;
      next();
    } catch (err) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    const user = (socket as any).user;
    console.log(`[Socket] User connected: ${user.id}`);

    socket.on("join-incident", async (incidentId: string) => {
      try {
        const participant = await prisma.incidentParticipant.findUnique({
          where: {
            incidentId_userId: {
              incidentId,
              userId: user.id
            }
          }
        });
        
        if (participant) {
          socket.join(`incident:${incidentId}`);
          console.log(`[Socket] User ${user.id} joined incident room: ${incidentId}`);
        } else {
          console.log(`[Socket] User ${user.id} attempted to join unauthorized room: ${incidentId}`);
        }
      } catch (err) {
        console.error("Error joining socket room:", err);
      }
    });

    socket.on("leave-incident", (incidentId: string) => {
      socket.leave(`incident:${incidentId}`);
      console.log(`[Socket] User ${user.id} left incident room: ${incidentId}`);
    });

    socket.on("TRANSCRIPT_PARTIAL", ({ incidentId, text }: { incidentId: string; text: string }) => {
      socket.to(`incident:${incidentId}`).emit("TRANSCRIPT_PARTIAL", { 
        userId: user.id, 
        userName: user.name, 
        text 
      });
    });

    socket.on("TRANSCRIPT_FINAL", ({ incidentId, text }: { incidentId: string; text: string }) => {
      // Fire and forget: AI processes asynchronously and doesn't block the socket thread
      processTranscript(io, socket, incidentId, text, user.name, user.id, undefined, 'voice').catch(console.error);
    });

    socket.on("disconnect", () => {
      console.log(`[Socket] User disconnected: ${user.id}`);
    });
  });

  return io;
};
