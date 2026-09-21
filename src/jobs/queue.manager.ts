/**
 * @canonical-root File-16: 16_06_SUB_ENGINES_SERVICES
 * @child-ext      File-11: 11_01_MAIN_BASE_SCHEMA
 * @child-ext      08_00__EXT_003_AUTOMATED_LOCKIN_MATURITY
 * @tier           Tier-3 Core Business & Financial Engines
 * @domain         Domain-01 Infrastructure & Domain-07 Affiliate Solvency
 * @zero-loss-rule Decoupled Asynchronous Queue Management & Automated Maturity Processing
 */

import { Queue, Worker, Job } from "bullmq";
import { RedisService } from "../cache/redis.client";
import { EscrowService } from "../services/billing/escrow.service";
import {
  CanonicalErrorFactory,
  CanonicalIdGenerator,
  RFC8785Serializer,
  ServiceResult,
} from "../core/contracts";

export interface EscrowMaturityJobData {
  triggeredBy: string;
  timestamp: string;
}

export class QueueManager {
  private static escrowQueue: Queue<EscrowMaturityJobData> | null = null;
  private static escrowWorker: Worker<EscrowMaturityJobData> | null = null;
  private static isInitialized = false;

  private static getRedisConnectionOptions() {
    const redis = RedisService.getClient();
    return {
      host: redis.options.host || "localhost",
      port: redis.options.port || 6379,
      password: redis.options.password || undefined,
      maxRetriesPerRequest: null,
    };
  }

  /**
   * Initialize BullMQ Queues and Workers.
   */
  public static initialize(): void {
    if (this.isInitialized) return;

    const connection = this.getRedisConnectionOptions();

    // 1. Escrow Maturity Task Queue
    this.escrowQueue = new Queue<EscrowMaturityJobData>("rm-escrow-maturity", {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });

    // 2. Escrow Maturity Background Worker
    this.escrowWorker = new Worker<EscrowMaturityJobData>(
      "rm-escrow-maturity",
      async (job: Job<EscrowMaturityJobData>) => {
        const traceId = CanonicalIdGenerator.generateTraceId();
        console.log(`[QueueManager Worker] Processing Escrow Maturity Job: ${job.id} | Trace: ${traceId}`);

        const result = await EscrowService.processMaturity();
        if (!result.success) {
          console.error(`[QueueManager Worker] Maturity processing failed:`, result.error);
          throw new Error(result.error?.message || "Maturity processing failed");
        }

        console.log(`[QueueManager Worker] Maturity Job Completed:`, result.data);
        return result.data;
      },
      { connection }
    );

    this.escrowWorker.on("failed", (job, err) => {
      console.error(`[QueueManager Worker] Job ${job?.id} failed with error:`, err);
    });

    this.isInitialized = true;
    console.log("[QueueManager] BullMQ queues and workers initialized successfully.");
  }

  /**
   * Schedule or dispatch an Escrow Maturity check job.
   */
  public static async dispatchEscrowMaturityCheck(): Promise<ServiceResult<{ jobId: string }>> {
    const traceId = CanonicalIdGenerator.generateTraceId();
    this.initialize();

    if (!this.escrowQueue) {
      return CanonicalErrorFactory.create(
        "D01_INFRASTRUCTURE",
        "QUEUE_NOT_INITIALIZED",
        "Escrow maturity queue is unavailable.",
        traceId
      );
    }

    try {
      const job = await this.escrowQueue.add(
        "process-maturity",
        {
          triggeredBy: "SCHEDULED_DISPATCHER",
          timestamp: new Date().toISOString(),
        },
        {
          jobId: `maturity-${Date.now()}`,
        }
      );

      return CanonicalErrorFactory.success({ jobId: job.id || "UNKNOWN" }, traceId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Queue dispatch error";
      return CanonicalErrorFactory.create(
        "D01_INFRASTRUCTURE",
        "QUEUE_DISPATCH_FAILED",
        message,
        traceId
      );
    }
  }

  /**
   * Graceful shutdown of workers and queues.
   */
  public static async close(): Promise<void> {
    if (this.escrowWorker) {
      await this.escrowWorker.close();
      this.escrowWorker = null;
    }
    if (this.escrowQueue) {
      await this.escrowQueue.close();
      this.escrowQueue = null;
    }
    this.isInitialized = false;
    console.log("[QueueManager] All BullMQ workers and queues closed cleanly.");
  }
}

export default QueueManager;
