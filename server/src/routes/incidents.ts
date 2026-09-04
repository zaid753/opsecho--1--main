import express from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import prisma from "../lib/prisma";
import crypto from "crypto";

const router = express.Router();

// Generate a human-friendly room code (e.g., PAY-4827)
const generateRoomCode = () => {
  const prefix = ["OPS", "PAY", "DB", "API", "NET", "SRV", "UI", "AUTH"][Math.floor(Math.random() * 8)];
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${suffix}`;
};

// Create Incident
router.post("/", authenticate, async (req: AuthRequest, res) => {
  const { title, description, severity, service, environment, impact } = req.body;
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    let roomCode = generateRoomCode();
    // Ensure room code uniqueness
    let exists = await prisma.incident.findUnique({ where: { roomCode } });
    while (exists) {
      roomCode = generateRoomCode();
      exists = await prisma.incident.findUnique({ where: { roomCode } });
    }

    const incident = await prisma.incident.create({
      data: {
        title,
        description,
        severity,
        service,
        environment,
        impact,
        roomCode,
        createdById: userId,
        status: "CREATED",
        timeline: {
          create: {
            type: "STATUS_CHANGE",
            description: "Incident created",
            metadata: { severity, service, environment }
          }
        }
      },
    });

    // Add creator as the first participant
    await prisma.incidentParticipant.create({
      data: {
        incidentId: incident.id,
        userId: userId,
      },
    });

    res.status(201).json(incident);
  } catch (error) {
    console.error("Create incident error:", error);
    res.status(500).json({ error: "Failed to create incident" });
  }
});

// Get My Incidents
router.get("/", authenticate, async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const incidents = await prisma.incident.findMany({
      where: {
        participants: {
          some: {
            userId: userId,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: {
          select: { name: true, role: true },
        },
        participants: {
          include: {
            user: {
              select: { name: true, role: true },
            },
          },
        },
      },
    });

    res.json(incidents);
  } catch (error) {
    console.error("Get incidents error:", error);
    res.status(500).json({ error: "Failed to fetch incidents" });
  }
});

// Join Incident by Room Code
router.post("/join", authenticate, async (req: AuthRequest, res) => {
  const { roomCode } = req.body;
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const incident = await prisma.incident.findUnique({
      where: { roomCode },
    });

    if (!incident) {
      return res.status(404).json({ error: "Incident room not found" });
    }

    if (incident.status === "CLOSED") {
      return res.status(400).json({ error: "This incident room is closed" });
    }

    // Add participant if not already joined
    const participant = await prisma.incidentParticipant.upsert({
      where: {
        incidentId_userId: {
          incidentId: incident.id,
          userId: userId,
        },
      },
      update: {},
      create: {
        incidentId: incident.id,
        userId: userId,
      },
    });

    // Create join event in timeline
    await prisma.timelineEvent.create({
      data: {
        incidentId: incident.id,
        type: "PARTICIPANT_JOINED",
        description: `User joined the room`,
        metadata: { userId }
      }
    });

    res.json(incident);
  } catch (error) {
    console.error("Join incident error:", error);
    res.status(500).json({ error: "Failed to join incident" });
  }
});

// Get Incident Details
router.get("/:id", authenticate, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const incident = await prisma.incident.findUnique({
      where: { id },
      include: {
        createdBy: { select: { name: true, role: true } },
        participants: {
          include: {
            user: { select: { id: true, name: true, role: true } },
          },
        },
        actions: { include: { owner: { select: { name: true } } } },
        facts: true,
        hypotheses: true,
        decisions: true,
        timeline: { orderBy: { timestamp: "asc" } },
      },
    });

    if (!incident) return res.status(404).json({ error: "Incident not found" });

    // Check if user is a participant
    const isParticipant = incident.participants.some(p => p.userId === userId);
    if (!isParticipant) {
      return res.status(403).json({ error: "Forbidden: You are not a participant in this incident" });
    }

    res.json(incident);
  } catch (error) {
    console.error("Get incident details error:", error);
    res.status(500).json({ error: "Failed to fetch incident details" });
  }
});

// Resolve Incident
router.post("/:id/resolve", authenticate, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const incident = await prisma.incident.update({
      where: { id },
      data: { 
        status: "RESOLVED",
        timeline: {
          create: {
            type: "STATUS_CHANGE",
            description: "Incident resolved",
            metadata: { resolvedBy: userId }
          }
        }
      },
    });

    const io = req.app.get("io");
    io.to(`incident:${id}`).emit("incident:updated", incident);

    res.json(incident);
  } catch (error) {
    console.error("Resolve incident error:", error);
    res.status(500).json({ error: "Failed to resolve incident" });
  }
});

export default router;
