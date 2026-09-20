/**
 * @canonical-root File-16: 16_06_SUB_ENGINES_SERVICES
 * @child-ext      File-11: 11_01_MAIN_BASE_SCHEMA
 * @child-ext      01_00__EXT_004_UNIFIED_ZEL_CORRECTION_ROADMAP
 * @tier           Tier-1 & Tier-2 Master Bootstrap
 * @domain         Domain-00, Domain-01 & Domain-03
 * @zero-loss-rule Sovereign Runtime Lifecycle & Graceful Shutdown
 */

import { startServer } from "./server";
import { prisma } from "./database/prisma.client";
import { RedisService } from "./cache/redis.client";
import { CanonicalIdGenerator } from "./core/contracts";

const bootstrap = async (): Promise<void> => {
  const bootTraceId = CanonicalIdGenerator.generateTraceId();
  console.log(`[Rise Mitra] Initializing Core Kernel... Trace ID: ${bootTraceId}`);

  try {
    // 1. Verify Database Connectivity (Tier-1 Data Foundation)
    await prisma.$connect();
    console.log("[Rise Mitra] Database connection established successfully (Prisma).");

    // 2. Verify Redis Connectivity (Tier-1 Cache & Nonce Guard)
    const redisClient = RedisService.getClient();
    await redisClient.ping();
    console.log("[Rise Mitra] Cache & Nonce store active (Redis).");

    // 3. Start Fastify Kernel & Ingress Listener
    const server = await startServer();
    console.log("[Rise Mitra] Master Kernel fully bootstrapped. Mode: ACTIVE_FOR_SCAFFOLDING_ONLY.");

    // 4. Graceful Shutdown Signals (Fail-Closed Lifecycle)
    const handleShutdown = async (signal: string) => {
      console.log(`[Rise Mitra] Received ${signal}. Initiating graceful shutdown...`);
      try {
        await server.close();
        await prisma.$disconnect();
        await RedisService.close();
        console.log("[Rise Mitra] All subsystem connections closed cleanly. Process exiting.");
        process.exit(0);
      } catch (shutdownError) {
        console.error("[Rise Mitra] Error during graceful shutdown:", shutdownError);
        process.exit(1);
      }
    };

    process.on("SIGINT", () => void handleShutdown("SIGINT"));
    process.on("SIGTERM", () => void handleShutdown("SIGTERM"));
  } catch (error) {
    console.error(`[Rise Mitra Fatal] Kernel bootstrap failed! Trace ID: ${bootTraceId}`, error);
    await prisma.$disconnect().catch(() => {});
    await RedisService.close().catch(() => {});
    process.exit(1);
  }
};

void bootstrap();
