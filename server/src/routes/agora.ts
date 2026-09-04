import express from "express";
import pkg from "agora-access-token";
const { RtcTokenBuilder, RtcRole } = pkg;
import { authenticate, AuthRequest } from "../middleware/auth";
import prisma from "../lib/prisma";

const router = express.Router();

const APP_ID = process.env.AGORA_APP_ID;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

router.post("/token", authenticate, async (req: AuthRequest, res) => {
  const { incidentId } = req.body;
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!APP_ID || !APP_CERTIFICATE) {
    return res.status(500).json({ error: "Agora configuration missing on server" });
  }

  try {
    // Verify user is a participant
    const participant = await prisma.incidentParticipant.findUnique({
      where: {
        incidentId_userId: {
          incidentId,
          userId,
        },
      },
    });

    if (!participant) {
      return res.status(403).json({ error: "Forbidden: You are not a participant in this incident" });
    }

    const channelName = `incident_${incidentId}`;
    const uid = 0; // Let Agora assign a numeric UID
    const role = RtcRole.PUBLISHER;
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const token = RtcTokenBuilder.buildTokenWithUid(
      APP_ID,
      APP_CERTIFICATE,
      channelName,
      uid,
      role,
      privilegeExpiredTs
    );

    res.json({ token, channelName, uid, appId: APP_ID });
  } catch (error) {
    console.error("Agora token error:", error);
    res.status(500).json({ error: "Failed to generate Agora token" });
  }
});

export default router;
