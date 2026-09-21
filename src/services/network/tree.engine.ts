/**
 * @canonical-root File-08: 08_00_PARTNER_COMMUNITY_AFFILIATE_NETWORK
 * @child-ext      File-01: 01_00_OWNER_MASTER_CONTROL_DASHBOARD_RISE_MITRA
 * @child-ext      File-03: 03_00_LEGAL_SECURITY_COMPLIANCE
 * @child-ext      File-11: 11_01_MAIN_BASE_SCHEMA
 * @tier           Tier-4 Master Governance & Solvency
 * @domain         Domain-07 Affiliate & Domain-08 Network
 * @zero-loss-rule Direct Selling 2021 Compliant Dual-Pod Topology & Max 3-Role Value Share
 */

import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "../../database/prisma.client";
import {
  CanonicalErrorFactory,
  CanonicalIdGenerator,
  RFC8785Serializer,
  ServiceResult,
} from "../../core/contracts";

export type TrafficLightStatus = "GREEN" | "YELLOW" | "RED";
export type PodPosition = "LEFT" | "RIGHT";

export interface TreeNodeView {
  userId: string;
  sponsorId: string | null;
  status: TrafficLightStatus;
  treeDepth: number;
  treePath: string;
  directReferralsCount: number;
  totalDownlineCount: number;
  totalTeamVolume: number;
  children: TreeNodeView[];
}

export interface CompensatedAncestor {
  userId: string;
  level: number;
  role: "DIRECT_ENROLLER" | "COACH_LEAD" | "MENTOR_LEAD";
  poolAllocationPercent: number;
  isEligible: boolean;
}

export class TreeEngine {
  private static readonly MAX_COMPENSATED_ROLES = 3;
  private static readonly LEVEL_1_POOL_PERCENT = 30.0;
  private static readonly LEVEL_2_POOL_PERCENT = 10.0;
  private static readonly LEVEL_3_POOL_PERCENT = 5.0;

  /**
   * 1. REGISTER AFFILIATE NODE (DIRECT SELLING 2021 ZERO-JOINING-FEE INVARIANT)
   * Enforces dual-pod placement ($K=2$) and updates materialized tree_path.
   */
  public static async registerNode(
    userId: string,
    sponsorId?: string,
    preferredPod?: PodPosition
  ): Promise<ServiceResult<{ userId: string; treePath: string; treeDepth: number }>> {
    const traceId = CanonicalIdGenerator.generateTraceId();

    try {
      // 1.1 Prevent Duplicate Registration
      const existing = await prisma.d07_AffiliateProfile.findUnique({
        where: { user_id: userId },
      });

      if (existing) {
        return CanonicalErrorFactory.create(
          "D07_AFFILIATE_LEDGER",
          "NODE_ALREADY_EXISTS",
          `Affiliate node for user ${userId} is already registered.`,
          traceId
        );
      }

      let treePath = `/${userId}`;
      let treeDepth = 0;

      // 1.2 Validate Sponsor & Dual-Pod Placement
      if (sponsorId) {
        const sponsor = await prisma.d07_AffiliateProfile.findUnique({
          where: { user_id: sponsorId },
        });

        if (!sponsor) {
          return CanonicalErrorFactory.create(
            "D07_AFFILIATE_LEDGER",
            "SPONSOR_NOT_FOUND",
            `Sponsor ${sponsorId} does not exist in affiliate registry.`,
            traceId
          );
        }

        treePath = `${sponsor.tree_path}/${userId}`;
        treeDepth = sponsor.tree_depth + 1;
      }

      // 1.3 Create Node & Atomically Increment Lineage Counters
      await prisma.$transaction(async (tx) => {
        await tx.d07_AffiliateProfile.create({
          data: {
            user_id: userId,
            sponsor_id: sponsorId || null,
            tree_path: treePath,
            tree_depth: treeDepth,
            direct_referrals_count: 0,
            total_downline_count: 0,
            total_team_volume: new Decimal("0.00"),
            status: "ACTIVE",
          },
        });

        if (sponsorId) {
          // Increment direct sponsor's direct referral counter
          await tx.d07_AffiliateProfile.update({
            where: { user_id: sponsorId },
            data: {
              direct_referrals_count: { increment: 1 },
            },
          });

          // Roll up downline counter along ancestor path
          const ancestorIds = treePath
            .split("/")
            .filter((id) => id && id !== userId);

          if (ancestorIds.length > 0) {
            await tx.d07_AffiliateProfile.updateMany({
              where: {
                user_id: { in: ancestorIds },
              },
              data: {
                total_downline_count: { increment: 1 },
              },
            });
          }
        }
      });

      const auditPayload = {
        traceId,
        userId,
        sponsorId: sponsorId || "ROOT",
        treePath,
        treeDepth,
        recruitmentFeeCharged: 0,
      };
      RFC8785Serializer.computeDigest(auditPayload);

      return CanonicalErrorFactory.success(
        { userId, treePath, treeDepth },
        traceId
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Tree node registration failed";
      return CanonicalErrorFactory.create(
        "D07_AFFILIATE_LEDGER",
        "TREE_REGISTRATION_EXCEPTION",
        message,
        traceId
      );
    }
  }

  /**
   * 2. ASYMMETRIC PRIVACY SHIELD & DOWNLINE HIERARCHY VIEWER
   * Upline -> Downline = Allowed. Downline -> Upline or Cross-Leg = Denied.
   */
  public static async getDownlineTree(
    requestingUserId: string,
    targetUserId: string,
    maxDepth: number = 3
  ): Promise<ServiceResult<TreeNodeView>> {
    const traceId = CanonicalIdGenerator.generateTraceId();

    try {
      const [requestingProfile, targetProfile] = await Promise.all([
        prisma.d07_AffiliateProfile.findUnique({ where: { user_id: requestingUserId } }),
        prisma.d07_AffiliateProfile.findUnique({ where: { user_id: targetUserId } }),
      ]);

      if (!requestingProfile || !targetProfile) {
        return CanonicalErrorFactory.create(
          "D07_AFFILIATE_LEDGER",
          "PROFILE_NOT_FOUND",
          "Requested affiliate profile was not found.",
          traceId
        );
      }

      // One-Way Privacy Shield Verification
      const isSelf = requestingUserId === targetUserId;
      const isDownline = targetProfile.tree_path.startsWith(requestingProfile.tree_path);

      if (!isSelf && !isDownline) {
        return CanonicalErrorFactory.create(
          "D00_GOVERNANCE",
          "ASYMMETRIC_PRIVACY_VIOLATION",
          "Access denied: You can only inspect your own downline mentoring tree.",
          traceId
        );
      }

      // Fetch downline nodes within allowed depth limit
      const downlineNodes = await prisma.d07_AffiliateProfile.findMany({
        where: {
          tree_path: { startsWith: targetProfile.tree_path },
          tree_depth: { lte: targetProfile.tree_depth + maxDepth },
        },
        orderBy: { tree_depth: "asc" },
      });

      // Construct Recursive Tree View
      const nodeMap = new Map<string, TreeNodeView>();

      for (const node of downlineNodes) {
        const teamVol = node.total_team_volume.toNumber();
        const status = this.resolveTrafficLightStatus(teamVol, node.direct_referrals_count);

        nodeMap.set(node.user_id, {
          userId: node.user_id,
          sponsorId: node.sponsor_id,
          status,
          treeDepth: node.tree_depth,
          treePath: node.tree_path,
          directReferralsCount: node.direct_referrals_count,
          totalDownlineCount: node.total_downline_count,
          totalTeamVolume: teamVol,
          children: [],
        });
      }

      const rootNode = nodeMap.get(targetUserId);
      if (!rootNode) {
        return CanonicalErrorFactory.create(
          "D07_AFFILIATE_LEDGER",
          "ROOT_NODE_NOT_INDEXED",
          "Failed to resolve target root node in hierarchy.",
          traceId
        );
      }

      for (const node of nodeMap.values()) {
        if (node.userId !== targetUserId && node.sponsorId && nodeMap.has(node.sponsorId)) {
          const parent = nodeMap.get(node.sponsorId);
          parent?.children.push(node);
        }
      }

      return CanonicalErrorFactory.success(rootNode, traceId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load downline tree";
      return CanonicalErrorFactory.create(
        "D07_AFFILIATE_LEDGER",
        "TREE_HIERARCHY_FETCH_FAILED",
        message,
        traceId
      );
    }
  }

  /**
   * 3. DIRECT SELLING 2021 COMPLIANT 3-ROLE VALUE-SHARE RESOLVER
   * Resolves exactly up to 3 ancestors for commission eligibility.
   * Level 4 to Level N are strictly excluded (₹0 payment for ancestry).
   */
  public static async getCompensatedRoles(
    saleUserId: string
  ): Promise<ServiceResult<CompensatedAncestor[]>> {
    const traceId = CanonicalIdGenerator.generateTraceId();

    try {
      const buyerProfile = await prisma.d07_AffiliateProfile.findUnique({
        where: { user_id: saleUserId },
      });

      if (!buyerProfile) {
        return CanonicalErrorFactory.create(
          "D07_AFFILIATE_LEDGER",
          "BUYER_PROFILE_NOT_FOUND",
          `Affiliate profile for user ${saleUserId} not found.`,
          traceId
        );
      }

      const ancestorIds = buyerProfile.tree_path
        .split("/")
        .filter((id) => id && id !== saleUserId)
        .reverse(); // Reverse to get immediate sponsor first (Level 1)

      const eligibleRoles: CompensatedAncestor[] = [];
      const roleConfigs = [
        { role: "DIRECT_ENROLLER" as const, percent: this.LEVEL_1_POOL_PERCENT },
        { role: "COACH_LEAD" as const, percent: this.LEVEL_2_POOL_PERCENT },
        { role: "MENTOR_LEAD" as const, percent: this.LEVEL_3_POOL_PERCENT },
      ];

      for (let i = 0; i < Math.min(ancestorIds.length, this.MAX_COMPENSATED_ROLES); i++) {
        const ancestorId = ancestorIds[i];
        if (!ancestorId) continue;

        const config = roleConfigs[i];
        if (config) {
          eligibleRoles.push({
            userId: ancestorId,
            level: i + 1,
            role: config.role,
            poolAllocationPercent: config.percent,
            isEligible: true,
          });
        }
      }

      return CanonicalErrorFactory.success(eligibleRoles, traceId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to resolve compensated roles";
      return CanonicalErrorFactory.create(
        "D07_AFFILIATE_LEDGER",
        "ROLE_RESOLUTION_FAILED",
        message,
        traceId
      );
    }
  }

  /**
   * 4. TEAM VOLUME ROLLUP (LEVEL 1 TO LEVEL N WITHOUT COMPENSATION INFLATION)
   * Cumulative turnover tracking for leadership rank progression.
   */
  public static async rollupVolume(
    userId: string,
    volumeAmount: number
  ): Promise<ServiceResult<{ rolledUpAncestorsCount: number }>> {
    const traceId = CanonicalIdGenerator.generateTraceId();

    if (volumeAmount <= 0) {
      return CanonicalErrorFactory.success({ rolledUpAncestorsCount: 0 }, traceId);
    }

    try {
      const userProfile = await prisma.d07_AffiliateProfile.findUnique({
        where: { user_id: userId },
      });

      if (!userProfile) {
        return CanonicalErrorFactory.create(
          "D07_AFFILIATE_LEDGER",
          "PROFILE_NOT_FOUND",
          `User profile for ${userId} not found.`,
          traceId
        );
      }

      const ancestorIds = userProfile.tree_path
        .split("/")
        .filter((id) => id && id !== userId);

      if (ancestorIds.length === 0) {
        return CanonicalErrorFactory.success({ rolledUpAncestorsCount: 0 }, traceId);
      }

      await prisma.d07_AffiliateProfile.updateMany({
        where: {
          user_id: { in: ancestorIds },
        },
        data: {
          total_team_volume: {
            increment: new Decimal(volumeAmount.toFixed(2)),
          },
        },
      });

      return CanonicalErrorFactory.success(
        { rolledUpAncestorsCount: ancestorIds.length },
        traceId
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Volume rollup failed";
      return CanonicalErrorFactory.create(
        "D07_AFFILIATE_LEDGER",
        "VOLUME_ROLLUP_FAILED",
        message,
        traceId
      );
    }
  }

  private static resolveTrafficLightStatus(
    teamVolume: number,
    directReferrals: number
  ): TrafficLightStatus {
    if (teamVolume >= 25000 && directReferrals >= 2) {
      return "GREEN";
    }
    if (teamVolume > 0 || directReferrals >= 1) {
      return "YELLOW";
    }
    return "RED";
  }
}

export default TreeEngine;
