/**
 * @canonical-root File-10 (10_00_AUTOMATION_ORCHESTRATION_RISE_MITRA)
 * @child-ext      File-14 (14_04_SUB_FEATURE_EXTERNAL_INTEGRATIONS)
 * @tier           Tier-3
 * @domain         Domain-08 (Hyperlocal Commerce & Gig Operations)
 * @zero-loss-rule 1km Geofence Corridor, 4-Digit OTP Handshake & Atomic Escrow Settlement
 */

import { PrismaClient } from "@prisma/client";
import { createHash, randomInt } from "crypto";
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  base: { service: "HyperlocalMatcher-Service", domain: "Domain-08" },
});

export interface CreateOrderInput {
  sectorId: string;
  merchantId: string;
  customerId: string;
  templateId: string;
  orderGrossPaise: number; // In Paise (e.g. 50000 = ₹500.00)
  deliveryDistanceMeters: number; // Hard-capped at 1000m
  weatherSurchargePaise?: number;
}

export interface OrderCreationResult {
  orderId: string;
  orderNumber: string;
  status: string;
  otpCode: string; // Plaintext OTP returned ONLY to customer at creation
  deliveryDistanceMeters: number;
  runnerPayoutPaise: number;
}

export interface DeliveryVerificationResult {
  orderId: string;
  orderNumber: string;
  status: "DELIVERED" | "OTP_INVALID" | "ALREADY_COMPLETED";
  escrowCleared: boolean;
  merchantGrossPaidPaise: string;
  runnerPayoutPaise: number;
}

export class HyperlocalMatcherService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
  }

  /**
   * Generates a secure 4-digit numeric OTP and its SHA-256 hash
   */
  private generateOtp(): { plainOtp: string; hashedOtp: string } {
    const numeric = randomInt(1000, 9999).toString();
    const hash = createHash("sha256").update(numeric).digest("hex");
    return { plainOtp: numeric, hashedOtp: hash };
  }

  /**
   * Dispatches a new hyperlocal order within the strict 1km pilot geofence corridor
   */
  public async createOrder(input: CreateOrderInput): Promise<OrderCreationResult> {
    // 1. Geofence Boundary Check (1000 Meters Hard Cap)
    if (input.deliveryDistanceMeters > 1000) {
      throw new Error(
        `Order exceeds hyperlocal corridor limit: ${input.deliveryDistanceMeters}m (Max allowed: 1000m).`
      );
    }

    // 2. Validate Fulfilment Template & Payout Rules
    const template = await this.prisma.d04_FulfilmentTemplate.findUnique({
      where: { id: input.templateId },
    });

    if (!template || !template.is_active) {
      throw new Error(`Fulfilment template '${input.templateId}' is invalid or disabled.`);
    }

    const runnerPayout = template.base_runner_payout_paise + (input.weatherSurchargePaise || 0);
    const { plainOtp, hashedOtp } = this.generateOtp();
    const orderNumber = `RM-ORD-${Date.now()}-${randomInt(100, 999)}`;

    // 3. Atomically persist order in database
    const order = await this.prisma.d08_HyperlocalOrder.create({
      data: {
        order_number: orderNumber,
        sector_id: input.sectorId,
        merchant_id: input.merchantId,
        customer_id: input.customerId,
        template_id: input.templateId,
        order_gross_paise: BigInt(input.orderGrossPaise),
        convenience_fee_paise: 300, // ₹3.00 Standard Micro-Utility Fee
        runner_payout_paise: runnerPayout,
        otp_code_hash: hashedOtp,
        status: "INITIATED",
        escrow_cleared: false,
        delivery_distance_meters: input.deliveryDistanceMeters,
      },
    });

    logger.info(
      { orderId: order.id, orderNumber, distance: input.deliveryDistanceMeters },
      "Hyperlocal order initiated within 1km geofence"
    );

    return {
      orderId: order.id,
      orderNumber: order.order_number,
      status: order.status,
      otpCode: plainOtp,
      deliveryDistanceMeters: order.delivery_distance_meters,
      runnerPayoutPaise: runnerPayout,
    };
  }

  /**
   * Assigns an active community runner to an order
   */
  public async assignRunner(orderId: string, runnerId: string): Promise<boolean> {
    const order = await this.prisma.d08_HyperlocalOrder.findUnique({
      where: { id: orderId },
    });

    if (!order || order.status !== "INITIATED") {
      throw new Error(`Order ${orderId} is not eligible for runner dispatch.`);
    }

    await this.prisma.d08_HyperlocalOrder.update({
      where: { id: orderId },
      data: {
        runner_id: runnerId,
        status: "OUT_FOR_DELIVERY",
      },
    });

    logger.info({ orderId, runnerId }, "Runner successfully assigned to order");
    return true;
  }

  /**
   * Verifies doorstep 4-digit OTP and triggers atomic escrow clearance
   */
  public async verifyDoorstepDelivery(orderId: string, submittedOtp: string): Promise<DeliveryVerificationResult> {
    const order = await this.prisma.d08_HyperlocalOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found.`);
    }

    if (order.status === "DELIVERED" || order.escrow_cleared) {
      return {
        orderId: order.id,
        orderNumber: order.order_number,
        status: "ALREADY_COMPLETED",
        escrowCleared: true,
        merchantGrossPaidPaise: order.order_gross_paise.toString(),
        runnerPayoutPaise: order.runner_payout_paise,
      };
    }

    // Cryptographic validation of OTP
    const submittedHash = createHash("sha256").update(submittedOtp.trim()).digest("hex");
    if (submittedHash !== order.otp_code_hash) {
      logger.warn({ orderId }, "Doorstep delivery OTP mismatch");
      return {
        orderId: order.id,
        orderNumber: order.order_number,
        status: "OTP_INVALID",
        escrowCleared: false,
        merchantGrossPaidPaise: "0",
        runnerPayoutPaise: 0,
      };
    }

    // Atomic Escrow Clearance: 100% Gross to Merchant, 100% Runner Fee Cleared
    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      const completed = await tx.d08_HyperlocalOrder.update({
        where: { id: orderId },
        data: {
          status: "DELIVERED",
          escrow_cleared: true,
          updated_at: new Date(),
        },
      });

      // Immutable Audit Entry
      await tx.d00_OwnerAuditLog.create({
        data: {
          action: "HYPERLOCAL_ESCROW_CLEARED",
          actor_id: order.runner_id || "SYSTEM",
          target_domain: "DOMAIN_08_COMMERCE",
          payload_hash: submittedHash,
          details: `Order ${order.order_number} verified via OTP. Gross ₹${Number(order.order_gross_paise) / 100} released.`,
          timestamp: new Date(),
        },
      });

      return completed;
    });

    logger.info({ orderId, orderNumber: updatedOrder.order_number }, "Doorstep OTP verified. Escrow cleared atomically.");

    return {
      orderId: updatedOrder.id,
      orderNumber: updatedOrder.order_number,
      status: "DELIVERED",
      escrowCleared: true,
      merchantGrossPaidPaise: updatedOrder.order_gross_paise.toString(),
      runnerPayoutPaise: updatedOrder.runner_payout_paise,
    };
  }
}
