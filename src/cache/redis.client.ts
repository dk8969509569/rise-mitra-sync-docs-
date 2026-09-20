/**
 * @canonical-root File-11: 11_01_MAIN_BASE_SCHEMA
 * @child-ext      File-16: 16_06_SUB_ENGINES_SERVICES
 * @tier           Tier-1 Foundation
 * @domain         Domain-01 Infrastructure & Security
 * @zero-loss-rule Replay Attack Mitigation & Distributed Nonce Lock
 */

import Redis from "ioredis";
import { CanonicalErrorFactory, CanonicalIdGenerator, ServiceResult } from "../core/contracts";

export class RedisService {
  private static instance: Redis | null = null;

  public static getClient(): Redis {
    if (!this.instance) {
      const redisUrl = process.env["REDIS_URL"] || "redis://localhost:6379";
      this.instance = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true,
      });

      this.instance.on("error", (err) => {
        console.error("[Domain-01 Redis Error] Fail-Closed State:", err.message);
      });
    }
    return this.instance;
  }

  // 1. DISTRIBUTED NONCE LOCK (Prevents Replay Attacks & Duplicate Webhooks)
  public static async verifyAndLockNonce(
    nonce: string,
    ttlSeconds: number = 300
  ): Promise<ServiceResult<{ locked: boolean }>> {
    const traceId = CanonicalIdGenerator.generateTraceId();
    try {
      const redis = this.getClient();
      const lockKey = `rm:nonce:${nonce}`;
      const result = await redis.set(lockKey, "LOCKED", "EX", ttlSeconds, "NX");

      if (result !== "OK") {
        return CanonicalErrorFactory.create(
          "D01_INFRASTRUCTURE",
          "NONCE_ALREADY_USED",
          "Duplicate transaction or replay request rejected.",
          traceId,
          { nonce }
        );
      }

      return CanonicalErrorFactory.success({ locked: true }, traceId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Redis lock exception";
      return CanonicalErrorFactory.create(
        "D01_INFRASTRUCTURE",
        "CACHE_OPERATION_FAILED",
        message,
        traceId
      );
    }
  }

  // 2. DISCONNECT LIFECYCLE
  public static async close(): Promise<void> {
    if (this.instance) {
      await this.instance.quit();
      this.instance = null;
    }
  }
}

export default RedisService;
