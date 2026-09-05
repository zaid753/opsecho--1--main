import { Router } from 'express';

const router = Router();

router.post('/monitoring', (req, res) => {
  const { service } = req.body;
  // Simulate latency
  setTimeout(() => {
    res.json({
      status: "success",
      data: {
        service: service || "unknown",
        cpuUsage: "98%",
        memoryUsage: "2.4GB",
        errorRate: "14%",
        latency: "1250ms",
        status: "DEGRADED"
      }
    });
  }, 1000);
});

router.post('/deployments', (req, res) => {
  const { service } = req.body;
  setTimeout(() => {
    res.json({
      status: "success",
      data: {
        service: service || "unknown",
        lastDeployTime: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
        version: "v2.1.4",
        status: "SUCCESS",
        triggeredBy: "github-actions"
      }
    });
  }, 800);
});

router.post('/rollback', (req, res) => {
  const { service, targetVersion } = req.body;
  setTimeout(() => {
    res.json({
      status: "success",
      data: {
        service: service || "unknown",
        previousVersion: "v2.1.4",
        newVersion: targetVersion || "v2.1.3",
        status: "ROLLBACK_INITIATED",
        estimatedCompletion: "2 minutes"
      }
    });
  }, 1500);
});

export default router;
