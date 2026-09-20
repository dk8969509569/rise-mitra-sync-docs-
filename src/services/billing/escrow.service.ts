/**
 * @canonical-root File-04: 04_00_FINANCIAL_FRAMEWORK_BILLING
 * @child-ext      File-16: 16_06_SUB_ENGINES_SERVICES
 * @child-ext      08_00__EXT_002_MANDATORY_COMMISSION_LOCKIN
 * @child-ext      08_00__EXT_003_AUTOMATED_LOCKIN_MATURITY
 * @tier           Tier-3 Core Business & Solvency
 * @domain         Domain-03 Billing & Domain-07 Affiliate Solvency
 * @zero-loss-rule 30-Day Mandatory Escrow Lock-In & 28% NCR Ceiling Verification
 */

import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "../../database/prisma.client";
import {
  CanonicalErrorFactory,
  CanonicalIdGenerator,
  RFC8785Serializer,
  ServiceResult,
} from "../../core/contracts";

export interface CreateEscrowDepositParams {
  userId: string;
  amount: number;
  sourceEvent: string;
  idempotencyKey: string;
  lockinDays?: number;
}

export interface MatureEscrowResult {
  maturedCount: number;
  totalMaturedAmount: number;
  processedAt: string;
}

export class EscrowService {
  private static readonly MAX_NCR_CEILING_PERCENT = 28.0;
  private static readonly DEFAULT_LOCKIN_DAYS = 30;

  /**
   * 1. CREATE ESCROW DEPOSIT WITH 30-DAY LOCK-IN SCHEDULE
   * Ensures funds are locked for 30 full days before becoming eligible for withdrawal.
   */
  public static async lockFunds(
    params: CreateEscrowDepositParams
  ): Promise<ServiceResult<{ lockinId: string; unlockAt: Date; amount: number }>> {
    const traceId = CanonicalIdGenerator.generateTraceId();

    if (params.amount <= 0) {
      return CanonicalErrorFactory.create(
        "D03_BILLING",
        "INVALID_ESCROW_AMOUNT",
        "Escrow deposit amount must be greater than zero.",
        traceId
      );
    }

    try {
      const lockinDurationDays = params.lockinDays ?? this.DEFAULT_LOCKIN_DAYS;
      const lockedAt = new Date();
      const unlockAt = new Date(lockedAt.getTime() + lockinDurationDays * 24 * 60 * 60 * 1000);

      const record = await prisma.$transaction(async (tx) => {
        // 1.1 Create Double-Entry Credit in Ledger
        await tx.d07_AffiliateLedger.create({
          data: {
            user_id: params.userId,
            amount: new Decimal(params.amount.toFixed(2)),
            entry_type: "CREDIT",
            source_event: params.sourceEvent,
            idempotency_key: params.idempotencyKey,
          },
        });

        // 1.2 Create Mandatory 30-Day Escrow Lock-in Schedule
        const lockin = await tx.d07_LockinSchedule.create({
          data: {
            user_id: params.userId,
            amount: new Decimal(params.amount.toFixed(2)),
            locked_at: lockedAt,
            unlock_at: unlockAt,
            status: "LOCKED",
          },
        });

        return lockin;
      });

      const auditPayload = {
        traceId,
        lockinId: record.id,
        userId: params.userId,
        amount: params.amount,
        unlockAt: unlockAt.toISOString(),
      };
      RFC8785Serializer.computeDigest(auditPayload);

      return CanonicalErrorFactory.success(
        {
          lockinId: record.id,
          unlockAt,
          amount: params.amount,
        },
        traceId
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Escrow creation error";
      return CanonicalErrorFactory.create(
        "D03_BILLING",
        "ESCROW_DEPOSIT_FAILED",
        `Failed to lock funds in escrow: ${message}`,
        traceId
      );
    }
  }

  /**
   * 2. AUTOMATED MATURITY PROCESSOR (08_00__EXT_003)
   * Converts all 'LOCKED' balances with unlock_at <= NOW() to 'WITHDRAWABLE'.
   */
  public static async processMaturity(): Promise<ServiceResult<MatureEscrowResult>> {
    const traceId = CanonicalIdGenerator.generateTraceId();
    const now = new Date();

    try {
      const maturedRecords = await prisma.d07_LockinSchedule.findMany({
        where: {
          status: "LOCKED",
          unlock_at: {
            lte: now,
          },
        },
      });

      if (maturedRecords.length === 0) {
        return CanonicalErrorFactory.success(
          {
            maturedCount: 0,
            totalMaturedAmount: 0,
            processedAt: now.toISOString(),
          },
          traceId
        );
      }

      let totalMatured = 0;
      await prisma.$transaction(async (tx) => {
        for (const record of maturedRecords) {
          await tx.d07_LockinSchedule.update({
            where: { id: record.id },
            data: { status: "WITHDRAWABLE" },
          });
          totalMatured += record.amount.toNumber();
        }
      });

      return CanonicalErrorFactory.success(
        {
          maturedCount: maturedRecords.length,
          totalMaturedAmount: totalMatured,
          processedAt: now.toISOString(),
        },
        traceId
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Escrow maturity error";
      return CanonicalErrorFactory.create(
        "D07_AFFILIATE",
        "ESCROW_MATURITY_FAILED",
        `Failed to process escrow maturity: ${message}`,
        traceId
      );
    }
  }

  /**
   * 3. 28.00% NCR CEILING SOLVENCY VERIFIER
   * Ensures company net commissions paid never breach the 28.00% hard-cap ceiling.
   */
  public static verifyNcrCeiling(totalPayout: number, totalVolume: number): boolean {
    if (totalVolume <= 0) return true;
    const currentNcrPercentage = (totalPayout / totalVolume) * 100;
    return currentNcrPercentage <= this.MAX_NCR_CEILING_PERCENT;
  }
}

export default EscrowService;
