/**
 * @canonical-root File-16: 16_06_SUB_ENGINES_SERVICES
 * @child-ext      01_00__EXT_004_UNIFIED_ZEL_CORRECTION_ROADMAP
 * @tier           Tier-1 & Tier-2 Interface
 * @domain         Domain-00, Domain-01 & Domain-03
 * @zero-loss-rule Non-blocking Ingress, Decoupled Webhook & Redis Nonce-Lock Replay Protection
 */

import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { webhookCallback } from "grammy";
import {
  CanonicalErrorFactory,
  CanonicalIdGenerator,
  RFC8785Serializer,
  ServiceResult,
} from "./core/contracts";
import { createBotInstance } from "./bot/bot";
import { RedisService } from "./cache/redis.client";

export interface FastifyServerConfig {
  port: number;
  host: string;
  systemMode: string;
  botToken?: string;
  webhookSecret?: string;
}

export const createFastifyServer = (config?: Partial<FastifyServerConfig>): FastifyInstance => {
  const server: FastifyInstance = Fastify({
    logger: {
      level: process.env["NODE_ENV"] === "production" ? "info" : "debug",
      serializers: {
        req(req: FastifyRequest) {
          return {
            method: req.method,
            url: req.url,
            hostname: req.hostname,
            remoteAddress: req.ip,
            traceId: req.headers["x-trace-id"] || "UNSET",
          };
        },
      },
    },
    disableRequestLogging: false,
    requestIdHeader: "x-trace-id",
    genReqId: () => CanonicalIdGenerator.generateTraceId(),
  });

  // 1. HEALTH AND READINESS PROBE
  server.get("/health", async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = (request.id as string) || CanonicalIdGenerator.generateTraceId();
    const payload = {
      status: "UP",
      timestamp: new Date().toISOString(),
      mode: process.env["SYSTEM_DEFAULT_STATE"] || "MODE-01 (ACTIVE_FOR_SCAFFOLDING_ONLY)",
      uptimeSeconds: process.uptime(),
      version: "v0.20.0-FROZEN",
    };

    const digest = RFC8785Serializer.computeDigest(payload);
    reply.header("x-payload-digest", digest);
    return reply.status(200).send(CanonicalErrorFactory.success(payload, traceId));
  });

  // 2. ROOT DISCOVERY ENDPOINT
  server.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = (request.id as string) || CanonicalIdGenerator.generateTraceId();
    const info = {
      name: "Rise Mitra Multi-Domain Core Kernel",
      tier: "Tier-1 & Tier-2 Interface Active",
      compliance: "DPDP 2025 • Direct Selling 2021 • 28% NCR Ceiling",
      documentation: "Folder A Canonical Baseline v0.20.0",
    };
    return reply.status(200).send(CanonicalErrorFactory.success(info, traceId));
  });

  // 3. TELEGRAM INBOUND WEBHOOK (Domain-03 Decoupled Connector & Nonce Guard)
  const botInstance = createBotInstance(config?.botToken);
  const botWebhookHandler = webhookCallback(botInstance, "fastify");

  server.post("/webhook/telegram", async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = (request.id as string) || CanonicalIdGenerator.generateTraceId();
    const secretHeader = request.headers["x-telegram-bot-api-secret-token"];
    const expectedSecret = config?.webhookSecret || process.env["WEBHOOK_SECRET"];

    // 3.1 Webhook Secret Authentication
    if (expectedSecret && secretHeader !== expectedSecret) {
      server.log.warn({ traceId }, "Unauthorized Telegram webhook signature rejected");
      return reply.status(401).send(
        CanonicalErrorFactory.create(
          "D01_INFRASTRUCTURE",
          "UNAUTHORIZED_WEBHOOK_SOURCE",
          "Invalid Telegram webhook authentication secret.",
          traceId
        )
      );
    }

    // 3.2 Inbound Nonce-Locking & Replay Attack Mitigation (File-11 & File-16 L04)
    const updatePayload = request.body as { update_id?: number } | undefined;
    const updateId = updatePayload?.update_id;

    if (updateId !== undefined && updateId !== null) {
      const nonceKey = `tg:update:${updateId}`;
      const lockResult = await RedisService.verifyAndLockNonce(nonceKey, 300);

      if (!lockResult.success) {
        server.log.warn(
          { traceId, updateId },
          "Duplicate Telegram update suppressed by distributed nonce lock"
        );
        return reply.status(200).send({
          status: "DEDUPLICATED",
          update_id: updateId,
          message: "Duplicate Telegram update suppressed by distributed nonce lock.",
          trace_id: traceId,
        });
      }
    }

    return botWebhookHandler(request, reply);
  });

  // 4. GLOBAL ERROR HANDLER (Deny-by-Default & No Secret Leaks)
  server.setErrorHandler((error, request: FastifyRequest, reply: FastifyReply) => {
    const traceId = (request.id as string) || CanonicalIdGenerator.generateTraceId();
    server.log.error({ err: error, traceId }, "Internal request failure encountered");

    const errorResponse: ServiceResult<never> = CanonicalErrorFactory.create(
      "D01_INFRASTRUCTURE",
      error.code || "INTERNAL_SERVER_ERROR",
      process.env["NODE_ENV"] === "production"
        ? "An internal system exception occurred. Request logged securely."
        : error.message,
      traceId
    );

    reply.status(error.statusCode || 500).send(errorResponse);
  });

  return server;
};

// 5. BOOTSTRAP STANDALONE LIFECYCLE
export const startServer = async (): Promise<FastifyInstance> => {
  const port = Number(process.env["PORT"]) || 3000;
  const host = "0.0.0.0";
  const app = createFastifyServer();

  try {
    await app.listen({ port, host });
    app.log.info(`[Fastify] Kernel listener active on http://${host}:${port}`);
    return app;
  } catch (err) {
    app.log.fatal(err, "[Fastify] Failed to start server instance");
    process.exit(1);
  }
};

if (require.main === module) {
  void startServer();
}

export default createFastifyServer;
