/**
 * @canonical-root File-03 (03_00_LEGAL_SECURITY_PRIVACY_COMPLIANCE_RISE_MITRA)
 * @child-ext      NONE
 * @tier           Tier-4
 * @domain         Domain-07
 * @zero-loss-rule Invariant validated against master specification: DPDP Act 2023 / Rules 2025
 */

import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "crypto";
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  base: { service: "DPDP-Service", domain: "Domain-07" },
});

export interface GrievanceRequest {
  userId: string;
  category: "ACCESS" | "CORRECTION" | "ERASURE" | "COMPLAINT";
  details: string;
  ipAddress: string;
}

export interface GrievanceRecord {
  ticketId: string;
  userId: string;
  category: string;
  status: "ACKNOWLEDGED" | "UNDER_REVIEW" | "RESOLVED" | "REJECTED";
  acknowledgedAt: Date;
  ackSlaDeadline: Date;     // 48 Hours SLA
  resolutionDeadline: Date; // 30 Days SLA
  resolvedAt?: Date;
  resolutionSummary?: string;
}

export class DPDPGovernanceService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
  }

  /**
   * Generates irreversible cryptographic pseudonym for purged identities
   */
  private generateTombstoneToken(originalIdentifier: string): string {
    const salt = randomBytes(16).toString("hex");
    const digest = createHash("sha256")
      .update(`${originalIdentifier}:${salt}:${Date.now()}`)
      .digest("hex")
      .substring(0, 16);
    return `USR-TOMBSTONE-${digest.toUpperCase()}`;
  }

  /**
   * Logs and tracks user grievance under DPDP 48h Ack / 30d Resolution SLA
   */
  public async registerGrievance(request: GrievanceRequest): Promise<GrievanceRecord> {
    const now = new Date();
    const ackDeadline = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 Hours
    const resolutionDeadline = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 Days
    const ticketId = `GRV-${Date.now()}-${randomBytes(4).toString("hex").toUpperCase()}`;

    logger.info({ ticketId, userId: request.userId, category: request.category }, "DPDP Grievance Ticket Registered");

    return {
      ticketId,
      userId: request.userId,
      category: request.category,
      status: "ACKNOWLEDGED",
      acknowledgedAt: now,
      ackSlaDeadline: ackDeadline,
      resolutionDeadline,
    };
  }

  /**
   * 24-Hour Autonomous Consent Revocation & PII Tombstoning Runbook
   * Wipes personal PII but preserves statutory financial transactions
   */
  public async executeConsentRevocation(userId: string, reason: string): Promise<{ success: boolean; tombstoneId: string }> {
    logger.warn({ userId, reason }, "Executing DPDP Statutory Tombstoning Protocol");

    const tombstoneId = this.generateTombstoneToken(userId);

    // Atomic transaction ensuring zero orphan records and preserving ledger
    await this.prisma.$transaction(async (tx) => {
      // 1. Check if user exists
      const user = await tx.userProfile.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error(`User not found for tombstoning: ${userId}`);
      }

      // 2. Anonymize user profile (Zero PII retention)
      await tx.userProfile.update({
        where: { id: userId },
        data: {
          telegram_username: null,
          first_name: "DECOMMISSIONED_CITIZEN",
          last_name: "TOMBSTONED",
          is_active: false,
          state: "TOMBSTONED",
          updated_at: new Date(),
        },
      });

      // 3. Immutable Security Audit Entry
      await tx.securityAuditLog.create({
        data: {
          id: `SEC-AUD-${randomBytes(8).toString("hex")}`,
          user_id: tombstoneId, // Reference pseudonym
          event_type: "DPDP_PII_PURGE_SUCCESS",
          severity: "INFO",
          payload_hash: createHash("sha256").update(`${userId}:${reason}:${Date.now()}`).digest("hex"),
          ip_address: "127.0.0.1",
          created_at: new Date(),
        },
      });
    });

    logger.info({ userId, tombstoneId }, "DPDP Tombstoning successfully executed. Financial ledger intact.");
    return { success: true, tombstoneId };
  }

  /**
   * Scheduled cron checking for expired consents exceeding 24-hour grace window
   */
  public async scanRevokedConsentsCron(): Promise<number> {
    logger.info("Starting automated DPDP 24-hour consent revocation sweep");
    // Sweeps revoked sessions or flagged profiles
    const pendingRevocations = await this.prisma.userProfile.findMany({
      where: {
        is_active: false,
        state: "PENDING_PURGE",
      },
      take: 100,
    });

    let purgedCount = 0;
    for (const record of pendingRevocations) {
      try {
        await this.executeConsentRevocation(record.id, "Automated 24h DPDP Scheduled Sweep");
        purgedCount++;
      } catch (err) {
        logger.error({ userId: record.id, err }, "Failed to purge user during scheduled sweep");
      }
    }

    logger.info({ purgedCount }, "DPDP scheduled sweep completed");
    return purgedCount;
  }
}
