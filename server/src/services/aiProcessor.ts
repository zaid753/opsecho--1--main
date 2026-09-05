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
    io.to(`incident:${incidentId}`).emit("TRANSCRIPT_NEW", transcript);

    // 2. Fetch Context for AI
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
      include: {
        facts: true,
        hypotheses: true,
        actions: true,
        decisions: true,
        transcripts: {
          orderBy: { timestamp: "desc" },
          take: 10
        }
      }
    });

    if (!incident) return;

    // 3. Analyze with AI
    // Send recent conversation history + the new transcript
    const recentHistory = incident.transcripts.reverse().map(t => `${t.userName}: ${t.text}`).join("\n");
    const aiResult = await analyzeTranscript(text, {
      title: incident.title,
      severity: incident.severity,
      existingFacts: incident.facts.map(f => f.description),
      existingHypotheses: incident.hypotheses.map(h => h.description),
      recentHistory: recentHistory
    });

    if (!aiResult) return;

    // 4. Update Database with AI Insights (Parallelized)
    const promises = [];

    if (aiResult.facts && aiResult.facts.length > 0) {
      promises.push(prisma.fact.createMany({
        data: aiResult.facts.map((f: any) => ({
          incidentId,
          description: f.description,
        })),
      }));
    }

    if (aiResult.hypotheses && aiResult.hypotheses.length > 0) {
      promises.push(prisma.hypothesis.createMany({
        data: aiResult.hypotheses.map((h: any) => ({
          incidentId,
          description: h.description,
          proposer: h.proposer,
        })),
      }));
    }

    if (aiResult.actions && aiResult.actions.length > 0) {
      promises.push(prisma.action.createMany({
        data: aiResult.actions.map((a: any) => ({
          incidentId,
          description: a.description,
          isCritical: a.isCritical || false,
        })),
      }));
    }

    if (aiResult.conflicts && aiResult.conflicts.length > 0) {
      promises.push(prisma.conflict.createMany({
        data: aiResult.conflicts.map((c: any) => ({
          incidentId,
          description: c.description,
        })),
      }));
    }

    if (aiResult.decisions && aiResult.decisions.length > 0) {
      promises.push(prisma.decision.createMany({
        data: aiResult.decisions.map((d: any) => ({
          incidentId,
          description: d.description,
          decider: d.decider,
        })),
      }));
    }

    if (aiResult.risks && aiResult.risks.length > 0) {
      promises.push(prisma.risk.createMany({
        data: aiResult.risks.map((r: any) => ({
          incidentId,
          description: r.description,
        })),
      }));
    }

    // Execute all database updates concurrently
    if (promises.length > 0) {
      await Promise.all(promises);
    }

    if (aiResult.aiResponse) {
      const aiTranscript = await prisma.transcript.create({
        data: {
          incidentId,
          userName: "AI Observer",
          text: aiResult.aiResponse,
        }
      });
      io.to(`incident:${incidentId}`).emit("TRANSCRIPT_NEW", aiTranscript);
      // Emit event specifically for TTS client
      io.to(`incident:${incidentId}`).emit("AI_SPEAK", { text: aiResult.aiResponse, id: aiTranscript.id });
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
        conflicts: true,
        transcripts: { orderBy: { timestamp: "desc" }, take: 50 },
        timeline: { orderBy: { timestamp: "asc" } },
      },
    });

    io.to(`incident:${incidentId}`).emit("incident:updated", updatedIncident);
  } catch (error) {
    console.error("[AI Processing] Error:", error);
  }
};
