/**
 * @canonical-root File-08 (08_00_PARTNER_PROGRAM_AFFILIATE_RISE_MITRA)
 * @child-ext      08_00__EXT_004_CROSS_DOMAIN_ENGAGEMENT_MULTIPLIERS
 * @child-ext      08_00__EXT_005_DYNAMIC_AFFILIATE_TIER_PROGRESSION
 * @tier           Tier-4
 * @domain         Domain-07
 * @zero-loss-rule 5% Monthly Leadership Pool Invariant, 10-Direct Anti-Dilution & 28.00% NCR Ceiling
 */

import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "crypto";
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  base: { service: "QualityPool-Service", domain: "Domain-07" },
});

export type LeadershipTier = "SILVER" | "GOLD" | "DIAMOND";

export interface PoolDistributionInput {
  monthIdentifier: string; // Format: YYYY-MM
  totalMonthlyTurnoverPaise: number; // In Paise
  currentNcrRatioPct: number; // Must not exceed 28.00%
}

export interface QualifiedPartnerShare {
  userId: string;
  tier: LeadershipTier;
  directReferrals: number;
  points: number;
  payoutPaise: number;
}

export interface PoolCalculationSummary {
  monthIdentifier: string;
  totalPoolPaise: number; // 5.00% of turnover
  silverPoolPaise: number; // 1.50%
  goldPoolPaise: number; // 2.00%
  diamondPoolPaise: number; // 1.50%
  qualifiedCount: number;
  distributions: QualifiedPartnerShare[];
}

export class QualityPoolService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
  }

  /**
   * Evaluates eligibility enforcing the strict 10-Direct Anti-Dilution Invariant
   */
  public async getQualifiedPartners(tier: LeadershipTier): Promise<Array<{ userId: string; directCount: number; points: number }>> {
    // 1. Fetch active affiliates having at least 10 direct referrals
    const affiliates = await this.prisma.d07_AffiliateProfile.findMany({
      where: {
        status: "ACTIVE",
        direct_referrals_count: { gte: 10 }, // Anti-Dilution Filter
      },
    });

    const results: Array<{ userId: string; directCount: number; points: number }> = [];

    for (const aff of affiliates) {
      const teamVolume = Number(aff.total_team_volume);

      // Tier qualification by cumulative team volume
      let qualifiedTier: LeadershipTier | null = null;
      if (teamVolume >= 500000) qualifiedTier = "DIAMOND";
      else if (teamVolume >= 200000) qualifiedTier = "GOLD";
      else if (teamVolume >= 50000) qualifiedTier = "SILVER";

      if (qualifiedTier === tier) {
        // Points equal to direct referrals count multiplied by rank weight
        const weight = tier === "DIAMOND" ? 3 : tier === "GOLD" ? 2 : 1;
        results.push({
          userId: aff.user_id,
          directCount: aff.direct_referrals_count,
          points: aff.direct_referrals_count * weight,
        });
      }
    }

    return results;
  }

  /**
   * Executes End-of-Month Pro-rata Pool Distribution with 28% NCR Guard
   */
  public async executeMonthlyDistribution(input: PoolDistributionInput): Promise<PoolCalculationSummary> {
    logger.info({ month: input.monthIdentifier }, "Executing 5% Leadership Quality Pool Calculation");

    // 1. Enforce 28.00% NCR Hard Ceiling Guard
    if (input.currentNcrRatioPct > 28.0) {
      throw new Error(
        `NCR Ceiling Breached: Current NCR ${input.currentNcrRatioPct}% exceeds 28.00% statutory hard-cap.`
      );
    }

    // 2. Compute 5% Total Pool and Tier Split
    const totalPoolPaise = Math.floor(input.totalMonthlyTurnoverPaise * 0.05);
    const silverPoolPaise = Math.floor(input.totalMonthlyTurnoverPaise * 0.015); // 1.5%
    const goldPoolPaise = Math.floor(input.totalMonthlyTurnoverPaise * 0.02); // 2.0%
    const diamondPoolPaise = Math.floor(input.totalMonthlyTurnoverPaise * 0.015); // 1.5%

    const distributions: QualifiedPartnerShare[] = [];

    const processTier = async (tier: LeadershipTier, tierPoolPaise: number) => {
      const candidates = await this.getQualifiedPartners(tier);
      const totalPoints = candidates.reduce((sum, c) => sum + c.points, 0);

      if (totalPoints === 0 || candidates.length === 0) {
        logger.info({ tier }, "No qualified candidates for tier; funds retained in reserve.");
        return;
      }

      for (const candidate of candidates) {
        // Pro-rata distribution formula: ClearedClassPool * (UserPoints / TotalPoints)
        const payoutPaise = Math.floor(tierPoolPaise * (candidate.points / totalPoints));
        distributions.push({
          userId: candidate.userId,
          tier,
          directReferrals: candidate.directCount,
          points: candidate.points,
          payoutPaise,
        });
      }
    };

    await processTier("SILVER", silverPoolPaise);
    await processTier("GOLD", goldPoolPaise);
    await processTier("DIAMOND", diamondPoolPaise);

    // 3. Atomic Ledger Settlement
    await this.prisma.$transaction(async (tx) => {
      for (const dist of distributions) {
        const idempotencyKey = `QP-${input.monthIdentifier}-${dist.userId}-${dist.tier}`;

        await tx.d07_AffiliateLedger.create({
          data: {
            user_id: dist.userId,
            amount: dist.payoutPaise / 100, // Stored in INR units
            entry_type: "CREDIT",
            source_event: `QUALITY_POOL_${dist.tier}_${input.monthIdentifier}`,
            idempotency_key: idempotencyKey,
            created_at: new Date(),
          },
        });
      }

      // 4. Immutable Governance Audit Entry
      const auditDigest = createHash("sha256")
        .update(JSON.stringify({ month: input.monthIdentifier, totalPoolPaise, count: distributions.length }))
        .digest("hex");

      await tx.d00_OwnerAuditLog.create({
        data: {
          action: "QUALITY_POOL_DISTRIBUTION_EXECUTED",
          actor_id: "SYSTEM_POOL_CRON",
          target_domain: "DOMAIN_07_AFFILIATE",
          payload_hash: auditDigest,
          details: `Month: ${input.monthIdentifier} | Total Pool: ₹${totalPoolPaise / 100} | Beneficiaries: ${distributions.length}`,
          timestamp: new Date(),
        },
      });
    });

    logger.info(
      { month: input.monthIdentifier, totalPoolPaise, beneficiaries: distributions.length },
      "Monthly Quality Pool successfully settled in double-entry ledger"
    );

    return {
      monthIdentifier: input.monthIdentifier,
      totalPoolPaise,
      silverPoolPaise,
      goldPoolPaise,
      diamondPoolPaise,
      qualifiedCount: distributions.length,
      distributions,
    };
  }
}
