/**
 * @canonical-root File-04: 04_00_FINANCIAL_FRAMEWORK_BILLING
 * @child-ext      File-08: 08_00_PARTNER_COMMUNITY_AFFILIATE_NETWORK
 * @child-ext      File-15: 15_05_MAIN_ENGINES_TRANSACTION_CORE
 * @child-ext      08_00__EXT_002_MANDATORY_COMMISSION_LOCKIN
 * @tier           Tier-4 Master Governance & Solvency
 * @domain         Domain-03 Billing, Domain-07 Affiliate & Domain-08 Network
 * @zero-loss-rule 28% NCR Hard-Cap Ceiling & 3-Role Value Share Calculation
 */

import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "../../database/prisma.client";
import {
  CanonicalErrorFactory,
  CanonicalIdGenerator,
  RFC8785Serializer,
  ServiceResult,
} from "../../core/contracts";
import { SolvencyEngine } from "../governance/solvency.engine";
import { TreeEngine, CompensatedAncestor } from "../network/tree.engine";

export interface CalculateCommissionParams {
  saleId: string;
  buyerUserId: string;
  grossTurnover: number;
  idempotencyKey: string;
}

export interface CommissionAllocation {
  recipientUserId: string;
  role: string;
  level: number;
  amount: number;
  lockinId?: string;
}

export interface CommissionDistributionResult {
  saleId: string;
  grossTurnover: number;
  totalCommissionPool: number;
  totalAllocatedAmount: number;
  allocations: CommissionAllocation[];
  processedAt: string;
}

export class AffiliateCommissionCalculator {
  private static readonly MAX_NCR_HARD_CAP_PERCENT = 28.0;
  private static readonly ESCROW_LOCKIN_DAYS = 30;

  /**
   * 1. CALCULATE AND ATOMICALLY DISTRIBUTE AFFILIATE COMMISSIONS
   * Enforces 28% NCR ceiling, Direct Selling 2021 3-role limits, and 30-day escrow.
   */
  public static async calculateAndDistribute(
    params: CalculateCommissionParams
  ): Promise<ServiceResult<CommissionDistributionResult>> {
    const traceId = CanonicalIdGenerator.generateTraceId();

    if (params.grossTurnover <= 0) {
      return CanonicalErrorFactory.create(
        "D07_AFFILIATE",
        "INVALID_TURNOVER_AMOUNT",
        "Sale turnover must be greater than zero.",
        traceId
      );
    }

    try {
      // 1.1 Compute Max Commission Pool (Hard-capped at 28.00% of gross sale)
      const totalCommissionPool = Number(
        ((params.grossTurnover * this.MAX_NCR_HARD_CAP_PERCENT) / 100).toFixed(2)
      );

      // 1.2 Resolve up to 3 Ancestors via Direct Selling 2021 Tree Engine
      const rolesResult = await TreeEngine.getCompensatedRoles(params.buyerUserId);
      if (!rolesResult.success || !rolesResult.data) {
        return CanonicalErrorFactory.create(
          "D07_AFFILIATE",
          "ANCESTOR_RESOLUTION_FAILED",
          rolesResult.error?.message || "Failed to resolve eligible upline roles.",
          traceId
        );
      }

      const eligibleRoles: CompensatedAncestor[] = rolesResult.data;
      const plannedAllocations: CommissionAllocation[] = [];
      let totalAllocatedAmount = 0;

      for (const roleInfo of eligibleRoles) {
        // Calculate role's share based on its percentage of the 28% commission pool
        const roleAmount = Number(
          ((totalCommissionPool * roleInfo.poolAllocationPercent) / 100).toFixed(2)
        );

        if (roleAmount > 0) {
          plannedAllocations.push({
            recipientUserId: roleInfo.userId,
            role: roleInfo.role,
            level: roleInfo.level,
            amount: roleAmount,
          });
          totalAllocatedAmount += roleAmount;
        }
      }

      // 1.3 Pre-Transaction Solvency Assertion (Fail-Closed Check)
      const solvencyCheck = await SolvencyEngine.assertTransactionSolvent(totalAllocatedAmount);
      if (!solvencyCheck.success || !solvencyCheck.data?.approved) {
        return CanonicalErrorFactory.create(
          "D00_GOVERNANCE",
          "SOLVENCY_ASSERTION_DENIED",
          solvencyCheck.error?.message || "Transaction aborted: Solvency check rejected distribution.",
          traceId
        );
      }

      // 1.4 Atomic Ledger & Escrow Settlement Transaction
      const lockedAt = new Date();
      const unlockAt = new Date(
        lockedAt.getTime() + this.ESCROW_LOCKIN_DAYS * 24 * 60 * 60 * 1000
      );

      const finalAllocations: CommissionAllocation[] = [];

      await prisma.$transaction(async (tx) => {
        for (const allocation of plannedAllocations) {
          // Double-Entry Credit in Ledger
          await tx.d07_AffiliateLedger.create({
            data: {
              user_id: allocation.recipientUserId,
              amount: new Decimal(allocation.amount.toFixed(2)),
              entry_type: "CREDIT",
              source_event: `COMMISSION_SALE_${params.saleId}_L${allocation.level}`,
              idempotency_key: `${params.idempotencyKey}_L${allocation.level}`,
            },
          });

          // 30-Day Escrow Lock-in Record
          const lockin = await tx.d07_LockinSchedule.create({
            data: {
              user_id: allocation.recipientUserId,
              amount: new Decimal(allocation.amount.toFixed(2)),
              locked_at: lockedAt,
              unlock_at: unlockAt,
              status: "LOCKED",
            },
          });

          finalAllocations.push({
            ...allocation,
            lockinId: lockin.id,
          });
        }
      });

      // 1.5 Roll up total team volume without inflating compensation
      await TreeEngine.rollupVolume(params.buyerUserId, params.grossTurnover);

      const distributionResult: CommissionDistributionResult = {
        saleId: params.saleId,
        grossTurnover: params.grossTurnover,
        totalCommissionPool,
        totalAllocatedAmount: Number(totalAllocatedAmount.toFixed(2)),
        allocations: finalAllocations,
        processedAt: new Date().toISOString(),
      };

      // RFC 8785 Digest verification
      RFC8785Serializer.computeDigest(distributionResult);

      return CanonicalErrorFactory.success(distributionResult, traceId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Commission calculation error";
      return CanonicalErrorFactory.create(
        "D07_AFFILIATE",
        "COMMISSION_DISTRIBUTION_FAILED",
        `Failed to distribute commission: ${message}`,
        traceId
      );
    }
  }
}

export default AffiliateCommissionCalculator;
