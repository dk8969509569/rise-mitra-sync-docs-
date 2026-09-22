/**
 * @canonical-root File-06 (06_00_CREATOR_AI_STUDIO_RISE_MITRA)
 * @child-ext      File-01 (01_00_OWNER_MASTER_CONTROL_DASHBOARD_RISE_MITRA)
 * @tier           Tier-4 Cost & AI Sentinel
 * @domain         Domain-00 & Domain-05
 * @zero-loss-rule Daily Token Quotas, Dynamic Model Downgrade & Fail-Closed Overload Protection
 */

import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  base: { service: "TokenSentinel-Service", domain: "Domain-05" },
});

export type ModelTier = "PREMIUM" | "ECONOMY" | "BLOCKED";

export interface TokenUsageRecord {
  userId: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costPaise: number;
  modelUsed: string;
}

export interface QuotaEvaluationResult {
  userId: string;
  dailyQuotaTokens: number;
  usedTokensToday: number;
  remainingTokens: number;
  percentageUsed: number;
  assignedModelTier: ModelTier;
  recommendedModel: string;
  isBlocked: boolean;
}

export class TokenSentinelService {
  private prisma: PrismaClient;
  private inMemoryDailyUsage: Map<string, { count: number; date: string }>;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
    this.inMemoryDailyUsage = new Map();
  }

  /**
   * Generates today's date key: YYYY-MM-DD
   */
  private getTodayKey(): string {
    return new Date().toISOString().substring(0, 10);
  }

  /**
   * Retrieves or initializes the daily usage count for a user
   */
  private getDailyTokens(userId: string): number {
    const today = this.getTodayKey();
    const entry = this.inMemoryDailyUsage.get(userId);

    if (!entry || entry.date !== today) {
      this.inMemoryDailyUsage.set(userId, { count: 0, date: today });
      return 0;
    }

    return entry.count;
  }

  /**
   * Evaluates user token quota and dynamically routes model tier
   */
  public async evaluateQuota(userId: string, defaultQuota: number = 50000): Promise<QuotaEvaluationResult> {
    const usedTokensToday = this.getDailyTokens(userId);
    const remainingTokens = Math.max(0, defaultQuota - usedTokensToday);
    const percentageUsed = Number(((usedTokensToday / defaultQuota) * 100).toFixed(2));

    let assignedModelTier: ModelTier = "PREMIUM";
    let recommendedModel = "gemini-1.5-pro";
    let isBlocked = false;

    if (percentageUsed >= 100) {
      assignedModelTier = "BLOCKED";
      recommendedModel = "NONE";
      isBlocked = true;
      logger.warn({ userId, usedTokensToday, defaultQuota }, "User AI quota exhausted. Enacting Fail-Closed cut-off.");
    } else if (percentageUsed >= 80) {
      // Dynamic Downgrade Corridor (80% to 99%)
      assignedModelTier = "ECONOMY";
      recommendedModel = "gemini-1.5-flash";
      logger.info({ userId, percentageUsed }, "User reached 80% quota threshold. Routed to Economy model.");
    }

    return {
      userId,
      dailyQuotaTokens: defaultQuota,
      usedTokensToday,
      remainingTokens,
      percentageUsed,
      assignedModelTier,
      recommendedModel,
      isBlocked,
    };
  }

  /**
   * Records completed AI call tokens and calculates cost in paise
   */
  public async recordUsage(
    userId: string,
    promptTokens: number,
    completionTokens: number,
    modelName: string
  ): Promise<TokenUsageRecord> {
    const totalTokens = promptTokens + completionTokens;
    const today = this.getTodayKey();

    // In-memory atomic accumulator
    const current = this.getDailyTokens(userId);
    this.inMemoryDailyUsage.set(userId, { count: current + totalTokens, date: today });

    // Cost Model (Paise): ₹0.15 per 1k input tokens, ₹0.60 per 1k output tokens
    const costPaise = Math.ceil((promptTokens * 0.00015 + completionTokens * 0.0006) * 100);

    // Audit Log for AI Observability
    const auditDigest = createHash("sha256")
      .update(`${userId}:${modelName}:${totalTokens}:${Date.now()}`)
      .digest("hex");

    try {
      await this.prisma.d00_OwnerAuditLog.create({
        data: {
          action: "AI_TOKEN_CONSUMPTION_RECORDED",
          actor_id: userId,
          target_domain: "DOMAIN_05_AI_STUDIO",
          payload_hash: auditDigest,
          details: `Model: ${modelName} | Prompt: ${promptTokens} | Completion: ${completionTokens} | Total: ${totalTokens} | Cost: ₹${costPaise / 100}`,
          timestamp: new Date(),
        },
      });
    } catch (dbErr) {
      logger.error({ dbErr }, "Failed to persist AI token consumption audit");
    }

    logger.info({ userId, totalTokens, costPaise, modelName }, "AI token usage successfully audited");

    return {
      userId,
      promptTokens,
      completionTokens,
      totalTokens,
      costPaise,
      modelUsed: modelName,
    };
  }

  /**
   * Scheduled midnight reset for memory state
   */
  public resetDailyCache(): void {
    logger.info("Executing midnight AI token sentinel cache flush");
    this.inMemoryDailyUsage.clear();
  }
}
