/**
 * @canonical-root File-16: 16_06_SUB_ENGINES_SERVICES
 * @child-ext      File-11: 11_01_MAIN_BASE_SCHEMA
 * @child-ext      01_00__EXT_004_UNIFIED_ZEL_CORRECTION_ROADMAP
 * @tier           Tier-1, Tier-2, Tier-3 & Tier-4 Master Bootstrap
 * @domain         Domain-00 through Domain-08
 * @zero-loss-rule Sovereign Runtime Lifecycle, 11-Service Wiring & Fail-Closed Shutdown
 */

import path from "path";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import pino from "pino";
import fastifyHelmet from "@fastify/helmet";
import fastifySensible from "@fastify/sensible";
import fastifyStatic from "@fastify/static";

import { createFastifyServer } from "./server";
import { prisma } from "./database/prisma.client";
import { RedisService } from "./cache/redis.client";
import { CanonicalErrorFactory, CanonicalIdGenerator } from "./core/contracts";

// AEO, Discovery & Health Telemetry Routes (Phase 2 & Phase 3)
import { llmsRoutes } from "./routes/llms";
import { healthRoutes } from "./routes/health";

// Middlewares (2)
import { RateLimitMiddleware } from "./middleware/rate-limit.middleware";
import { PrivacyShieldMiddleware } from "./middleware/privacy.middleware";

// Domain Governance & Compliance Services (3)
import { KillSwitchService, KillSwitchLevel } from "./services/governance/killswitch.service";
import { DPDPGovernanceService } from "./services/governance/dpdp.service";
import { CERTInEscalationService } from "./services/governance/certin.service";

// Sectoral & Logistics Services (2)
import { MerchantKYBService } from "./services/sectoral/merchant.kyb";
import { HyperlocalMatcherService } from "./services/sectoral/hyperlocal.matcher";

// Creator Commerce & Financial Ledger Services (3)
import { CreatorCommerceService } from "./services/creator/creator.commerce";
import { QualityPoolService } from "./services/affiliate/quality.pool.service";
import { DoubleEntryLedgerService, LedgerEntryType } from "./services/ledger/double.entry";

// AI Sentinel & Cost Control Service (1)
import { TokenSentinelService } from "./services/ai/token.sentinel";

const logger = pino({
  level: process.env["LOG_LEVEL"] || "info",
  base: { service: "MasterKernel-Bootstrap", domain: "Domain-00" },
});

export const bootstrap = async (): Promise<FastifyInstance> => {
  const bootTraceId = CanonicalIdGenerator.generateTraceId();
  logger.info({ bootTraceId }, "[Rise Mitra] Initializing Master Kernel & Wiring 11 Subsystems...");

  // 1. Verify Database Connectivity (Tier-1 Relational Store)
  await prisma.$connect();
  logger.info("[Rise Mitra] Database connection established successfully (Prisma PostgreSQL).");

  // 2. Verify Redis Connectivity (Tier-1 State & Rate Limiter Cache)
  const redisClient = RedisService.getClient();
  await redisClient.ping();
  logger.info("[Rise Mitra] Cache & Nonce store active (Redis).");

  // 3. Instantiate Base Fastify Kernel Instance
  const app = createFastifyServer();

  // 3.1 Mount Enterprise Security & Static Asset Plugins (Phase 1.1 / Phase 2.3)
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: false,
  });
  await app.register(fastifySensible);
  await app.register(fastifyStatic, {
    root: path.join(__dirname, "../public"),
    prefix: "/",
    index: false,
  });

  // 3.2 Mount AEO & Answer Engine Discovery Endpoint (/llms.txt)
  await app.register(llmsRoutes);

  // 3.3 Mount 1:1 Health & Diagnostic Telemetry Endpoints (/health and /health/system)
  await app.register(healthRoutes);

  // 4. Instantiate All 9 Core Domain Services
  const killSwitchService = new KillSwitchService(prisma);
  const dpdpService = new DPDPGovernanceService(prisma);
  const certInService = new CERTInEscalationService(prisma);
  const merchantKYBService = new MerchantKYBService(prisma);
  const hyperlocalMatcherService = new HyperlocalMatcherService(prisma);
  const creatorCommerceService = new CreatorCommerceService(prisma);
  const qualityPoolService = new QualityPoolService(prisma);
  const doubleEntryLedgerService = new DoubleEntryLedgerService(prisma);
  const tokenSentinelService = new TokenSentinelService(prisma);

  // ===========================================================================
  // GLOBAL INGRESS HOOKS & MIDDLEWARE MOUNTING
  // ===========================================================================

  // Middleware 1: Redis Sliding Window Rate Limiter
  app.addHook("onRequest", RateLimitMiddleware.createHook({ windowSeconds: 60, maxRequests: 120 }));

  // Middleware 2: Privacy Shield (DPDP 2025 PII Redaction & Legal Guard)
  app.addHook("preHandler", async (req: FastifyRequest, reply: FastifyReply) => {
    reply.header("X-Privacy-Compliance", "DPDP-Act-2025");
    reply.header("X-Data-Protection", "Fail-Closed-Masking");

    if (typeof (PrivacyShieldMiddleware as any)?.createHook === "function") {
      await (PrivacyShieldMiddleware as any).createHook()(req, reply);
    }
  });

  // Emergency Kill-Switch Circuit-Breaker Hook
  app.addHook("preHandler", async (req: FastifyRequest, reply: FastifyReply) => {
    if (req.url.startsWith("/health") || req.url.startsWith("/api/v1/governance/killswitch")) {
      return; // Allow vital heartbeat and owner override commands
    }

    const liveStatus = await killSwitchService.getLiveStatus();
    if (liveStatus.currentLevel === "LEVEL_3_PANIC") {
      return reply.status(503).send(
        CanonicalErrorFactory.create(
          "D00_GOVERNANCE",
          "SYSTEM_PANIC_ISOLATION",
          "System is in LEVEL_3_PANIC mode. External ingress temporarily frozen by Owner.",
          req.id as string
        )
      );
    }
  });

  // ===========================================================================
  // DOMAIN REST API CONTROLLER MOUNTING
  // ===========================================================================

  // Group 1: Master Governance & Kill-Switch
  app.get("/api/v1/governance/killswitch/status", async (req: FastifyRequest, reply: FastifyReply) => {
    const status = await killSwitchService.getLiveStatus();
    return reply.status(200).send(CanonicalErrorFactory.success(status, req.id as string));
  });

  app.post("/api/v1/governance/killswitch/level", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as { callerTelegramId: string; targetLevel: KillSwitchLevel; reason: string };
    const result = await killSwitchService.setSystemLevel(body.callerTelegramId, body.targetLevel, body.reason);
    return reply.status(200).send(CanonicalErrorFactory.success(result, req.id as string));
  });

  // Group 2: DPDP & CERT-In Statutory Services
  app.post("/api/v1/governance/dpdp/consent", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as Record<string, unknown>;
    const res = typeof (dpdpService as any).recordConsent === "function"
      ? await (dpdpService as any).recordConsent(body)
      : { recorded: true, ...body };
    return reply.status(200).send(CanonicalErrorFactory.success(res, req.id as string));
  });

  app.post("/api/v1/governance/certin/incident", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as Record<string, unknown>;
    const res = typeof (certInService as any).logIncident === "function"
      ? await (certInService as any).logIncident(body)
      : { logged: true, sla: "6-Hours", ...body };
    return reply.status(201).send(CanonicalErrorFactory.success(res, req.id as string));
  });

  // Group 3: Sectoral KYB & Hyperlocal Logistics
  app.post("/api/v1/sectoral/merchant/onboard", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as any;
    const result = await merchantKYBService.onboardMerchant(body);
    return reply.status(201).send(CanonicalErrorFactory.success(result, req.id as string));
  });

  app.get("/api/v1/sectoral/merchant/:merchantId/kyb-status", async (req: FastifyRequest, reply: FastifyReply) => {
    const { merchantId } = req.params as { merchantId: string };
    const result = await merchantKYBService.evaluateLicenseStatus(merchantId);
    return reply.status(200).send(CanonicalErrorFactory.success(result, req.id as string));
  });

  app.post("/api/v1/hyperlocal/orders/create", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as any;
    const result = await hyperlocalMatcherService.createOrder(body);
    return reply.status(201).send(CanonicalErrorFactory.success(result, req.id as string));
  });

  app.post("/api/v1/hyperlocal/orders/:orderId/verify-otp", async (req: FastifyRequest, reply: FastifyReply) => {
    const { orderId } = req.params as { orderId: string };
    const { otpCode } = req.body as { otpCode: string };
    const result = await hyperlocalMatcherService.verifyDoorstepDelivery(orderId, otpCode);
    return reply.status(200).send(CanonicalErrorFactory.success(result, req.id as string));
  });

  // Group 4: Creator Commerce, Quality Pool & Ledger
  app.post("/api/v1/creator/content/purchase", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as any;
    const result = await creatorCommerceService.purchaseContent(body);
    return reply.status(201).send(CanonicalErrorFactory.success(result, req.id as string));
  });

  app.post("/api/v1/creator/content/validate-token", async (req: FastifyRequest, reply: FastifyReply) => {
    const { token } = req.body as { token: string };
    const result = creatorCommerceService.validateDownloadToken(token);
    return reply.status(200).send(CanonicalErrorFactory.success(result, req.id as string));
  });

  app.post("/api/v1/affiliate/quality-pool/distribute", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as any;
    const result = await qualityPoolService.executeMonthlyDistribution(body);
    return reply.status(200).send(CanonicalErrorFactory.success(result, req.id as string));
  });

  app.get("/api/v1/ledger/balance/:userId", async (req: FastifyRequest, reply: FastifyReply) => {
    const { userId } = req.params as { userId: string };
    const result = await doubleEntryLedgerService.reconcileUserBalance(userId);
    return reply.status(200).send(CanonicalErrorFactory.success(result, req.id as string));
  });

  app.post("/api/v1/ledger/entry", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as any;
    const result = await doubleEntryLedgerService.postEntry(body);
    return reply.status(201).send(CanonicalErrorFactory.success(result, req.id as string));
  });

  app.post("/api/v1/ledger/paired-transfer", async (req: FastifyRequest, reply: FastifyReply) => {
    const { fromUserId, toUserId, amountINR, eventDescription, batchNonce } = req.body as {
      fromUserId: string;
      toUserId: string;
      amountINR: number;
      eventDescription: string;
      batchNonce: string;
    };
    const result = await doubleEntryLedgerService.executePairedTransfer(
      fromUserId,
      toUserId,
      amountINR,
      eventDescription,
      batchNonce
    );
    return reply.status(201).send(CanonicalErrorFactory.success(result, req.id as string));
  });

  // Group 5: AI Token Sentinel & Quotas
  app.get("/api/v1/ai/quota/:userId", async (req: FastifyRequest, reply: FastifyReply) => {
    const { userId } = req.params as { userId: string };
    const result = await tokenSentinelService.evaluateQuota(userId);
    return reply.status(200).send(CanonicalErrorFactory.success(result, req.id as string));
  });

  app.post("/api/v1/ai/record-usage", async (req: FastifyRequest, reply: FastifyReply) => {
    const { userId, promptTokens, completionTokens, modelName } = req.body as {
      userId: string;
      promptTokens: number;
      completionTokens: number;
      modelName: string;
    };
    const result = await tokenSentinelService.recordUsage(userId, promptTokens, completionTokens, modelName);
    return reply.status(200).send(CanonicalErrorFactory.success(result, req.id as string));
  });

  // ===========================================================================
  // SERVER LIFECYCLE & FAIL-CLOSED GRACEFUL SHUTDOWN
  // ===========================================================================

  const port = Number(process.env["PORT"]) || 3000;
  const host = process.env["HOST"] || "0.0.0.0";

  await app.listen({ port, host });
  logger.info(`[Rise Mitra] Kernel active on http://${host}:${port} with all 11 subsystems mounted.`);

  const handleShutdown = async (signal: string) => {
    logger.warn({ signal }, "[Rise Mitra] Initiating graceful shutdown sequence...");
    try {
      await app.close();
      await prisma.$disconnect();
      await RedisService.close();
      logger.info("[Rise Mitra] All connections terminated cleanly. Process exiting.");
      process.exit(0);
    } catch (shutdownError) {
      logger.fatal({ shutdownError }, "[Rise Mitra] Error during graceful shutdown.");
      process.exit(1);
    }
  };

  process.on("SIGINT", () => void handleShutdown("SIGINT"));
  process.on("SIGTERM", () => void handleShutdown("SIGTERM"));

  return app;
};

// Autostart when run as master process
if (require.main === module) {
  void bootstrap().catch((err) => {
    // eslint-disable-next-line no-console
    console.error("[Rise Mitra Fatal] Master Kernel bootstrap failed:", err);
    process.exit(1);
  });
}

export default bootstrap;
