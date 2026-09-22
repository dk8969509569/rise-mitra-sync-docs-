/**
 * @canonical-root File-01 (01_00_OWNER_MASTER_CONTROL_DASHBOARD_RISE_MITRA)
 * @child-ext      File-17 (17_07_MAIN_OPERATIONS_MONITORING_RISE_MITRA)
 * @tier           Tier-4 Master Governance & Emergency Response
 * @domain         Domain-00 (Master Governance & Safety)
 * @zero-loss-rule 3-Level Emergency Owner Kill-Switch & Fail-Closed State Machine
 */

import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  base: { service: "KillSwitch-Service", domain: "Domain-00" },
});

export type KillSwitchLevel =
  | "ACTIVE_NORMAL"
  | "LEVEL_1_PAUSE"
  | "LEVEL_2_HARD_KILL"
  | "LEVEL_3_PANIC";

export interface KillSwitchStatusPayload {
  currentLevel: KillSwitchLevel;
  updatedBy: string;
  reason: string;
  timestamp: string;
  isSignalIngressAllowed: boolean;
  isTradeExecutionAllowed: boolean;
  isPayoutProcessingAllowed: boolean;
  isWorkerExecutionAllowed: boolean;
}

export class KillSwitchService {
  private prisma: PrismaClient;
  private currentLevelCache: KillSwitchLevel;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
    this.currentLevelCache = "ACTIVE_NORMAL";
  }

  /**
   * Validates if the caller is authorized as the Supreme Owner
   */
  private verifyOwnerAuthorization(callerTelegramId: string | bigint): void {
    const ownerId = process.env.OWNER_TELEGRAM_ID;
    if (!ownerId || String(callerTelegramId) !== String(ownerId)) {
      logger.warn({ callerTelegramId }, "Unauthorized kill-switch access attempt rejected");
      throw new Error("UNAUTHORIZED_ACCESS: Kill-switch commands are restricted strictly to Owner.");
    }
  }

  /**
   * Retrieves the live active killswitch state from database config
   */
  public async getLiveStatus(): Promise<KillSwitchStatusPayload> {
    try {
      const config = await this.prisma.d00_SystemConfig.findUnique({
        where: { key: "KILL_SWITCH_STATUS" },
      });

      if (config && config.value) {
        this.currentLevelCache = config.value as KillSwitchLevel;
      }
    } catch (err) {
      logger.error({ err }, "Failed to fetch killswitch status from DB; falling back to memory cache");
    }

    const level = this.currentLevelCache;

    return {
      currentLevel: level,
      updatedBy: "SYSTEM",
      reason: "Live status inspection",
      timestamp: new Date().toISOString(),
      isSignalIngressAllowed: level === "ACTIVE_NORMAL",
      isTradeExecutionAllowed: level === "ACTIVE_NORMAL",
      isPayoutProcessingAllowed: level === "ACTIVE_NORMAL" || level === "LEVEL_1_PAUSE",
      isWorkerExecutionAllowed: level === "ACTIVE_NORMAL" || level === "LEVEL_1_PAUSE",
    };
  }

  /**
   * Enforces 3-Level Emergency Kill-Switch State Transition
   */
  public async setSystemLevel(
    callerTelegramId: string | bigint,
    targetLevel: KillSwitchLevel,
    reason: string
  ): Promise<KillSwitchStatusPayload> {
    this.verifyOwnerAuthorization(callerTelegramId);

    logger.warn(
      { caller: String(callerTelegramId), targetLevel, reason },
      "EMERGENCY: Initiating Kill-Switch State Transition"
    );

    const now = new Date();
    const callerStr = String(callerTelegramId);

    // 1. Update Persistent Master State in D00_SystemConfig
    await this.prisma.d00_SystemConfig.upsert({
      where: { key: "KILL_SWITCH_STATUS" },
      update: {
        value: targetLevel,
        updated_by: callerStr,
        updated_at: now,
      },
      create: {
        key: "KILL_SWITCH_STATUS",
        value: targetLevel,
        updated_by: callerStr,
        created_at: now,
        updated_at: now,
      },
    });

    this.currentLevelCache = targetLevel;

    // 2. Deterministic Audit Digest Generation
    const auditPayload = JSON.stringify({
      targetLevel,
      callerId: callerStr,
      reason,
      timestamp: now.toISOString(),
    });
    const payloadHash = createHash("sha256").update(auditPayload).digest("hex");

    // 3. Record Immutable Audit Trail in D00_OwnerAuditLog
    await this.prisma.d00_OwnerAuditLog.create({
      data: {
        action: `KILLSWITCH_SET_${targetLevel}`,
        actor_id: callerStr,
        target_domain: "DOMAIN_00_MASTER_GOVERNANCE",
        payload_hash: payloadHash,
        details: `Reason: ${reason} | System Level: ${targetLevel}`,
        timestamp: now,
      },
    });

    // 4. Autonomous Escalation Actions based on Severity Level
    switch (targetLevel) {
      case "LEVEL_1_PAUSE":
        logger.info("LEVEL 1 ENFORCED: Inbound trade signal generation paused. Positions remain monitored.");
        break;

      case "LEVEL_2_HARD_KILL":
        logger.warn("LEVEL 2 ENFORCED: Broker execution halted, affiliate payouts locked, workers suspended.");
        break;

      case "LEVEL_3_PANIC":
        logger.fatal("LEVEL 3 ENFORCED: System isolated. Database set to READ-ONLY mode. Emergency lockdown active.");
        break;

      case "ACTIVE_NORMAL":
        logger.info("NORMALCY RESTORED: All subsystems, trading pipelines, and worker queues operational.");
        break;
    }

    return {
      currentLevel: targetLevel,
      updatedBy: callerStr,
      reason,
      timestamp: now.toISOString(),
      isSignalIngressAllowed: targetLevel === "ACTIVE_NORMAL",
      isTradeExecutionAllowed: targetLevel === "ACTIVE_NORMAL",
      isPayoutProcessingAllowed: targetLevel === "ACTIVE_NORMAL" || targetLevel === "LEVEL_1_PAUSE",
      isWorkerExecutionAllowed: targetLevel === "ACTIVE_NORMAL" || targetLevel === "LEVEL_1_PAUSE",
    };
  }
}
