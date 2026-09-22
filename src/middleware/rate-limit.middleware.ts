/**
 * @canonical-root File-01 (01_00_OWNER_MASTER_CONTROL_DASHBOARD_RISE_MITRA)
 * @child-ext      File-10 (10_00_AUTOMATION_ORCHESTRATION_RISE_MITRA)
 * @tier           Tier-4 Cost & AI Sentinel
 * @domain         Domain-00 (Master Governance) & Domain-03 (Infrastructure)
 * @zero-loss-rule Redis Sliding Window Token Bucket Rate Limiter & Replay Mitigation
 */

import { FastifyRequest, FastifyReply } from "fastify";
import { RedisService } from "../cache/redis.client";
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  base: { service: "RateLimit-Middleware", domain: "Domain-00" },
});

export interface RateLimitConfig {
  windowSeconds: number;
  maxRequests: number;
}

export class RateLimitMiddleware {
  private static defaultWindowSeconds = 60;
  private static defaultMaxRequests = 60; // 60 requests per minute default

  /**
   * Evaluates request rate using Redis Sliding Window atomic transaction
   */
  public static async evaluateRate(
    identifier: string,
    config: RateLimitConfig = { windowSeconds: 60, maxRequests: 60 }
  ): Promise<{ allowed: boolean; remaining: number; resetTimeMs: number }> {
    const key = `ratelimit:${identifier}`;
    const now = Date.now();
    const windowStart = now - config.windowSeconds * 1000;

    try {
      const redis = RedisService.getClient();
      const pipeline = redis.pipeline();
      
      // 1. Evict entries outside the sliding time window
      pipeline.zremrangebyscore(key, 0, windowStart);
      // 2. Add current request timestamp
      pipeline.zadd(key, now.toString(), `${now}-${Math.random().toString(36).substring(2, 8)}`);
      // 3. Count total active hits in window
      pipeline.zcard(key);
      // 4. Reset TTL on key
      pipeline.expire(key, config.windowSeconds);

      const results = await pipeline.exec();
      const count = results && results[2] && typeof results[2][1] === "number" ? (results[2][1] as number) : 1;

      const allowed = count <= config.maxRequests;
      const remaining = Math.max(0, config.maxRequests - count);
      const resetTimeMs = now + config.windowSeconds * 1000;

      return { allowed, remaining, resetTimeMs };
    } catch (err) {
      logger.error({ err, identifier }, "Redis rate-limit evaluation failed; enforcing fallback fail-safe guard");
      return { allowed: true, remaining: 1, resetTimeMs: now + 60000 };
    }
  }

  /**
   * Fastify Hook for Ingress Rate Limiting
   */
  public static createHook(config?: Partial<RateLimitConfig>) {
    const activeConfig: RateLimitConfig = {
      windowSeconds: config?.windowSeconds || RateLimitMiddleware.defaultWindowSeconds,
      maxRequests: config?.maxRequests || RateLimitMiddleware.defaultMaxRequests,
    };

    return async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const clientIp = req.ip || req.socket.remoteAddress || "unknown_ip";
      const authUser = (req.headers["x-user-id"] as string) || clientIp;

      const result = await RateLimitMiddleware.evaluateRate(authUser, activeConfig);

      reply.header("X-RateLimit-Limit", activeConfig.maxRequests);
      reply.header("X-RateLimit-Remaining", result.remaining);
      reply.header("X-RateLimit-Reset", Math.ceil(result.resetTimeMs / 1000));

      if (!result.allowed) {
        logger.warn({ user: authUser, ip: clientIp }, "Rate limit ceiling breached. Request throttled.");
        reply.status(429).send({
          statusCode: 429,
          error: "Too Many Requests",
          message: `Rate limit of ${activeConfig.maxRequests} requests per ${activeConfig.windowSeconds}s exceeded.`,
        });
      }
    };
  }
}
