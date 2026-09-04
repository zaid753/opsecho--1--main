import express from "express";
import prisma from "../lib/prisma";
import axios from "axios";

const router = express.Router();

// Get active integrations for a user
router.get("/", async (req, res) => {
  const userId = req.headers["x-user-id"] as string; // Ideally extracted from JWT in auth middleware
  
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const integrations = await prisma.integration.findMany({
      where: { userId },
      select: { provider: true, createdAt: true },
    });
    res.json({ integrations });
  } catch (error) {
    console.error("Error fetching integrations:", error);
    res.status(500).json({ error: "Failed to fetch integrations" });
  }
});

// Slack OAuth - Step 1: Redirect to Slack
router.get("/slack/authorize", (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }
  
  const clientId = process.env.SLACK_CLIENT_ID;
  const redirectUri = encodeURIComponent(`${process.env.CLIENT_ORIGIN || 'http://localhost:3000'}/api/integrations/slack/callback`);
  
  // Pass userId in state to associate the token later
  const state = encodeURIComponent(JSON.stringify({ userId }));
  
  const slackUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=chat:write,chat:write.public&redirect_uri=${redirectUri}&state=${state}`;
  
  res.redirect(slackUrl);
});

// Slack OAuth - Step 2: Callback
router.get("/slack/callback", async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/settings?error=${error}`);
  }

  if (!code || !state) {
    return res.status(400).send("Missing code or state");
  }

  try {
    const { userId } = JSON.parse(decodeURIComponent(state as string));
    
    const response = await axios.post('https://slack.com/api/oauth.v2.access', null, {
      params: {
        client_id: process.env.SLACK_CLIENT_ID,
        client_secret: process.env.SLACK_CLIENT_SECRET,
        code,
        redirect_uri: `${process.env.CLIENT_ORIGIN || 'http://localhost:3000'}/api/integrations/slack/callback`
      }
    });

    if (!response.data.ok) {
      console.error("Slack OAuth error:", response.data.error);
      return res.redirect(`${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/settings?error=slack_auth_failed`);
    }

    const { access_token, team } = response.data;

    await prisma.integration.upsert({
      where: {
        userId_provider: {
          userId,
          provider: "SLACK"
        }
      },
      update: {
        accessToken: access_token,
        metadata: { teamId: team?.id, teamName: team?.name }
      },
      create: {
        userId,
        provider: "SLACK",
        accessToken: access_token,
        metadata: { teamId: team?.id, teamName: team?.name }
      }
    });

    res.redirect(`${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/settings?integration=slack_success`);
  } catch (err) {
    console.error("Failed to process Slack callback:", err);
    res.redirect(`${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/settings?error=server_error`);
  }
});

// Jira OAuth - Step 1: Redirect to Jira
router.get("/jira/authorize", (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }
  
  const clientId = process.env.JIRA_CLIENT_ID;
  const redirectUri = encodeURIComponent(`${process.env.CLIENT_ORIGIN || 'http://localhost:3000'}/api/integrations/jira/callback`);
  
  const state = encodeURIComponent(JSON.stringify({ userId }));
  
  // Jira OAuth 2.0 authorization URL
  const jiraUrl = `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=${clientId}&scope=read:jira-work write:jira-work&redirect_uri=${redirectUri}&state=${state}&response_type=code&prompt=consent`;
  
  res.redirect(jiraUrl);
});

// Jira OAuth - Step 2: Callback
router.get("/jira/callback", async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/settings?error=${error}`);
  }

  if (!code || !state) {
    return res.status(400).send("Missing code or state");
  }

  try {
    const { userId } = JSON.parse(decodeURIComponent(state as string));
    
    const response = await axios.post('https://auth.atlassian.com/oauth/token', {
      grant_type: 'authorization_code',
      client_id: process.env.JIRA_CLIENT_ID,
      client_secret: process.env.JIRA_CLIENT_SECRET,
      code,
      redirect_uri: `${process.env.CLIENT_ORIGIN || 'http://localhost:3000'}/api/integrations/jira/callback`
    });

    const { access_token, refresh_token } = response.data;

    // Optional: Get accessible resources (Cloud ID)
    const resourcesResponse = await axios.get('https://api.atlassian.com/oauth/token/accessible-resources', {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    
    const cloudId = resourcesResponse.data.length > 0 ? resourcesResponse.data[0].id : null;

    await prisma.integration.upsert({
      where: {
        userId_provider: {
          userId,
          provider: "JIRA"
        }
      },
      update: {
        accessToken: access_token,
        refreshToken: refresh_token,
        metadata: { cloudId }
      },
      create: {
        userId,
        provider: "JIRA",
        accessToken: access_token,
        refreshToken: refresh_token,
        metadata: { cloudId }
      }
    });

    res.redirect(`${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/settings?integration=jira_success`);
  } catch (err) {
    console.error("Failed to process Jira callback:", err);
    res.redirect(`${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/settings?error=server_error`);
  }
});

// Disconnect integration
router.delete("/:provider", async (req, res) => {
  const userId = req.headers["x-user-id"] as string;
  const { provider } = req.params;
  
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    await prisma.integration.delete({
      where: {
        userId_provider: {
          userId,
          provider: provider.toUpperCase()
        }
      }
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Error disconnecting integration:", error);
    res.status(500).json({ error: "Failed to disconnect integration" });
  }
});

export default router;
