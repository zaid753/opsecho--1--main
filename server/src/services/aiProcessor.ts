import { Socket } from "socket.io";
import prisma from "../lib/prisma";
import { analyzeTranscript } from "./gemini";

export const processTranscript = async (
  io: any, 
  socket: any, 
  incidentId: string, 
  text: string, 
  userName: string,
  userId: string
) => {
  try {
    // 1. Persist Transcript
    const transcript = await prisma.transcript.create({
      data: {
        incidentId,
        userId,
        userName,
        text,
      },
    });

    // Broadcast transcript to room
    io.to(`incident:${incidentId}`).emit("transcript:new", transcript);

    // 2. Fetch Context for AI
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
      include: {
        facts: true,
        hypotheses: true,
        actions: true,
        decisions: true
      }
    });

    if (!incident) return;

    // 3. Analyze with AI
    const aiResult = await analyzeTranscript(text, {
      title: incident.title,
      severity: incident.severity,
      existingFacts: incident.facts.map(f => f.description),
      existingHypotheses: incident.hypotheses.map(h => h.description)
    });

    if (!aiResult) return;

    // 4. Update Database with AI Insights
    // This part would ideally be managed by LangGraph nodes
    // For now, we perform direct persistence to show progress

    if (aiResult.facts?.length > 0) {
      await prisma.fact.createMany({
        data: aiResult.facts.map((f: any) => ({
          incidentId,
          description: f.description,
        })),
      });
    }

    if (aiResult.hypotheses?.length > 0) {
      await prisma.hypothesis.createMany({
        data: aiResult.hypotheses.map((h: any) => ({
          incidentId,
          description: h.description,
          proposer: h.proposer,
        })),
      });
    }

    if (aiResult.actions?.length > 0) {
      await prisma.action.createMany({
        data: aiResult.actions.map((a: any) => ({
          incidentId,
          description: a.description,
          isCritical: a.isCritical,
        })),
      });
    }

    if (aiResult.aiResponse) {
      const aiTranscript = await prisma.transcript.create({
        data: {
          incidentId,
          userName: "AI Observer",
          text: aiResult.aiResponse,
        }
      });
      io.to(`incident:${incidentId}`).emit("transcript:new", aiTranscript);
    }

    // 5. Broadcast refreshed state
    const updatedIncident = await prisma.incident.findUnique({
      where: { id: incidentId },
      include: {
        createdBy: { select: { name: true, role: true } },
        participants: {
          include: { user: { select: { id: true, name: true, role: true } } },
        },
        actions: { include: { owner: { select: { name: true } } } },
        facts: true,
        hypotheses: true,
        decisions: true,
        transcripts: { orderBy: { timestamp: "desc" }, take: 50 },
        timeline: { orderBy: { timestamp: "asc" } },
      },
    });

    io.to(`incident:${incidentId}`).emit("incident:updated", updatedIncident);
  } catch (error) {
    console.error("[AI Processing] Error:", error);
  }
};
