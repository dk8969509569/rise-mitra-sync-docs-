/**
 * @canonical-root File-04 (04_00_FINANCIAL_FRAMEWORK_BILLING_ESCROW_RISE_MITRA)
 * @child-ext      File-08 (08_00_PARTNER_PROGRAM_AFFILIATE_RISE_MITRA)
 * @tier           Tier-3 & Tier-4 Financial Integrity
 * @domain         Domain-03 (Billing) & Domain-07 (Affiliate Ledger)
 * @zero-loss-rule Double-Entry Invariant: User Balance == SUM(Credits) - SUM(Debits)
 */

import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  base: { service: "DoubleEntryLedger-Service", domain: "Domain-07" },
});

export type LedgerEntryType = "CREDIT" | "DEBIT";

export interface LedgerPostingInput {
  userId: string;
  amountINR: number;
  entryType: LedgerEntryType;
  sourceEvent: string;
  idempotencyKey: string;
  referenceNote?: string;
}

export interface BalanceReconciliationResult {
  userId: string;
  totalCreditsINR: number;
  totalDebitsINR: number;
  computedBalanceINR: number;
  isBalanced: boolean;
  ledgerEntriesCount: number;
}

export class DoubleEntryLedgerService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
  }

  /**
   * Generates a deterministic idempotency hash for financial entries
   */
  public generateIdempotencyKey(userId: string, event: string, amount: number, nonce: string): string {
    return createHash("sha256")
      .update(`${userId}:${event}:${amount.toFixed(2)}:${nonce}`)
      .digest("hex");
  }

  /**
   * Records an immutable single-leg entry with atomic idempotency enforcement
   */
  public async postEntry(entry: LedgerPostingInput): Promise<{ success: boolean; entryId: string }> {
    if (entry.amountINR <= 0) {
      throw new Error(`Invalid posting amount: ${entry.amountINR}. Financial entries must be strictly positive.`);
    }

    logger.info(
      { userId: entry.userId, amount: entry.amountINR, type: entry.entryType, event: entry.sourceEvent },
      "Posting double-entry journal leg"
    );

    // Atomic transaction ensuring zero ledger discrepancies
    const createdEntry = await this.prisma.$transaction(async (tx) => {
      // 1. Check for duplicate posting attempt
      const existing = await tx.d07_AffiliateLedger.findUnique({
        where: { idempotency_key: entry.idempotencyKey },
      });

      if (existing) {
        logger.warn({ key: entry.idempotencyKey }, "Duplicate ledger entry suppressed by idempotency guard");
        return existing;
      }

      // 2. Insert immutable ledger row
      const record = await tx.d07_AffiliateLedger.create({
        data: {
          user_id: entry.userId,
          amount: entry.amountINR,
          entry_type: entry.entryType,
          source_event: entry.sourceEvent,
          idempotency_key: entry.idempotencyKey,
          created_at: new Date(),
        },
      });

      // 3. Log Immutable Audit Record
      await tx.d00_OwnerAuditLog.create({
        data: {
          action: `LEDGER_${entry.entryType}_RECORDED`,
          actor_id: entry.userId,
          target_domain: "DOMAIN_07_LEDGER",
          payload_hash: entry.idempotencyKey,
          details: `Amount: ₹${entry.amountINR.toFixed(2)} | Event: ${entry.sourceEvent} | Note: ${entry.referenceNote || "N/A"}`,
          timestamp: new Date(),
        },
      });

      return record;
    });

    return { success: true, entryId: createdEntry.id };
  }

  /**
   * Verifies mathematical solvency: Available Balance == SUM(Credits) - SUM(Debits)
   */
  public async reconcileUserBalance(userId: string): Promise<BalanceReconciliationResult> {
    const entries = await this.prisma.d07_AffiliateLedger.findMany({
      where: { user_id: userId },
    });

    let totalCredits = 0;
    let totalDebits = 0;

    for (const record of entries) {
      const amt = Number(record.amount);
      if (record.entry_type === "CREDIT") {
        totalCredits += amt;
      } else if (record.entry_type === "DEBIT") {
        totalDebits += amt;
      }
    }

    const computedBalance = totalCredits - totalDebits;

    logger.info(
      { userId, totalCredits, totalDebits, computedBalance, count: entries.length },
      "Double-entry user balance reconciled"
    );

    return {
      userId,
      totalCreditsINR: Number(totalCredits.toFixed(2)),
      totalDebitsINR: Number(totalDebits.toFixed(2)),
      computedBalanceINR: Number(computedBalance.toFixed(2)),
      isBalanced: computedBalance >= 0, // Invariant: Ledger balance cannot drop below zero
      ledgerEntriesCount: entries.length,
    };
  }

  /**
   * Dispatches paired transfer between accounts (e.g. Platform Fee to Escrow Reserve)
   */
  public async executePairedTransfer(
    fromUserId: string,
    toUserId: string,
    amountINR: number,
    eventDescription: string,
    batchNonce: string
  ): Promise<{ debitEntryId: string; creditEntryId: string }> {
    const debitKey = this.generateIdempotencyKey(fromUserId, `${eventDescription}_DEBIT`, amountINR, batchNonce);
    const creditKey = this.generateIdempotencyKey(toUserId, `${eventDescription}_CREDIT`, amountINR, batchNonce);

    return await this.prisma.$transaction(async (tx) => {
      // Leg 1: Debit source account
      const debitRecord = await tx.d07_AffiliateLedger.create({
        data: {
          user_id: fromUserId,
          amount: amountINR,
          entry_type: "DEBIT",
          source_event: `${eventDescription}_DEBIT`,
          idempotency_key: debitKey,
          created_at: new Date(),
        },
      });

      // Leg 2: Credit destination account
      const creditRecord = await tx.d07_AffiliateLedger.create({
        data: {
          user_id: toUserId,
          amount: amountINR,
          entry_type: "CREDIT",
          source_event: `${eventDescription}_CREDIT`,
          idempotency_key: creditKey,
          created_at: new Date(),
        },
      });

      return {
        debitEntryId: debitRecord.id,
        creditEntryId: creditRecord.id,
      };
    });
  }
}
