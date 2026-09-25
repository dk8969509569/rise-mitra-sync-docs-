/**
 * @canonical-root File-15: 15_05_MAIN_ENGINES_TRADING_FINANCIAL
 * @child-ext      01_00__EXT_004_UNIFIED_ZEL_CORRECTION_ROADMAP
 * @domain         Domain-00 through Domain-08 (Health Routing Engine)
 * @zero-loss-rule 1:1 Ingress Telemetry, Traffic-Light Status & Fail-Closed Gate
 */

import { FastifyPluginAsync } from "fastify";
import { WatchdogHealthService } from "../services/health/watchdog.service";
import { prisma } from "../database/prisma.client";

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  const watchdog = new WatchdogHealthService(prisma);

  // 1. Lightweight Liveness Ping Probe
  fastify.get("/health", async (_request, reply) => {
    return reply.status(200).send({
      status: "UP",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    });
  });

  // 2. Deep Diagnostic & 1:1 9-Domain Watchdog Telemetry
  fastify.get("/health/system", async (_request, reply) => {
    const report = await watchdog.evaluateSystemHealth();

    // GREEN / YELLOW: 200 OK | RED: 503 Service Unavailable (Fail-Closed)
    const statusCode = report.overallStatus === "RED" ? 503 : 200;

    reply.header("X-Health-Status", report.overallStatus);
    reply.header("X-Trace-Id", report.traceId);

    return reply.status(statusCode).send(report);
  });
};

export default healthRoutes;
