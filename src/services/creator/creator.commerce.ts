/**
 * @canonical-root File-06 (06_00_CREATOR_AI_STUDIO_RISE_MITRA)
 * @child-ext      File-08 (08_00_PARTNER_PROGRAM_AFFILIATE)
 * @tier           Tier-3
 * @domain         Domain-05 (Creator Studio) & Domain-07 (Affiliate/Ledger)
 * @zero-loss-rule 70% Direct Creator Share Invariant & Signed Watermark Nonce Tokens
 */

import { PrismaClient } from "@prisma/client";
import { createHmac, createHash, randomBytes } from "crypto";
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  base: { service: "CreatorCommerce-Service", domain: "Domain-05" },
});

export interface PurchaseContentInput {
  buyerUserId: string;
  contentId: string;
  grossAmountPaise: number; // In Paise (e.g., ₹500.00 = 50000)
}

export interface PurchaseSettlementResult {
  purchaseId: string;
  contentId: string;
  buyerUserId: string;
  grossAmountPaise: number;
  creatorSharePaise: number;   // 70% Direct Settlement Invariant
  platformPoolPaise: number;   // 30% Platform & Quality Pool Contribution
  downloadToken: string;       // Ephemeral Token (TTL: 15 mins)
  tokenExpiresAt: Date;
  watermarkStamp: string;      // Immutable Anti-Piracy Identifier
}

export class CreatorCommerceService {
  private prisma: PrismaClient;
  private readonly signingSecret: string;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
    this.signingSecret = process.env.CREATOR_HMAC_SECRET || "RISE_MITRA_CREATOR_DYNAMIC_WATERMARK_2026";
  }

  /**
   * Generates a cryptographically signed dynamic watermark descriptor
   */
  public generateWatermarkStamp(buyerUserId: string, contentId: string): string {
    const timestamp = new Date().toISOString();
    const payload = `${buyerUserId}:${contentId}:${timestamp}`;
    const signature = createHmac("sha256", this.signingSecret).update(payload).digest("hex").substring(0, 16);
    return `LICENSED-TO-${buyerUserId.slice(-6).toUpperCase()}-SIG-${signature.toUpperCase()}`;
  }

  /**
   * Executes digital goods purchase enforcing 70% Creator Revenue Share Invariant
   */
  public async purchaseContent(input: PurchaseContentInput): Promise<PurchaseSettlementResult> {
    logger.info({ buyer: input.buyerUserId, content: input.contentId }, "Initiating digital content purchase");

    // 1. Verify content existence in D05_CreatorContent
    const content = await this.prisma.d05_CreatorContent.findUnique({
      where: { id: input.contentId },
    });

    if (!content) {
      throw new Error(`Digital content '${input.contentId}' not found.`);
    }

    // 2. Strict 70% Creator Share Calculation Invariant
    const creatorSharePaise = Math.floor(input.grossAmountPaise * 0.70);
    const platformPoolPaise = input.grossAmountPaise - creatorSharePaise; // 30% balance
    const purchaseId = `PUR-${Date.now()}-${randomBytes(4).toString("hex").toUpperCase()}`;

    // 3. Ephemeral Download Token Generation (TTL: 15 minutes)
    const tokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const tokenPayload = `${purchaseId}:${input.buyerUserId}:${tokenExpiresAt.getTime()}`;
    const tokenDigest = createHmac("sha256", this.signingSecret).update(tokenPayload).digest("hex");
    const downloadToken = `DL-${Buffer.from(tokenPayload).toString("base64url")}.${tokenDigest.substring(0, 24)}`;

    const watermarkStamp = this.generateWatermarkStamp(input.buyerUserId, input.contentId);

    // 4. Record Immutable Audit Trail in D00_OwnerAuditLog
    const auditPayload = JSON.stringify({
      purchaseId,
      buyer: input.buyerUserId,
      creator: content.author_id,
      gross: input.grossAmountPaise,
      creator70Pct: creatorSharePaise,
      pool30Pct: platformPoolPaise,
    });

    await this.prisma.d00_OwnerAuditLog.create({
      data: {
        action: "CREATOR_CONTENT_PURCHASE_CLEARED",
        actor_id: input.buyerUserId,
        target_domain: "DOMAIN_05_CREATOR_COMMERCE",
        payload_hash: createHash("sha256").update(auditPayload).digest("hex"),
        details: `Content ${input.contentId} purchased. 70% creator share (₹${creatorSharePaise / 100}) reserved.`,
        timestamp: new Date(),
      },
    });

    logger.info(
      { purchaseId, creatorSharePaise, platformPoolPaise },
      "Content purchase cleared under 70% creator settlement rule"
    );

    return {
      purchaseId,
      contentId: input.contentId,
      buyerUserId: input.buyerUserId,
      grossAmountPaise: input.grossAmountPaise,
      creatorSharePaise,
      platformPoolPaise,
      downloadToken,
      tokenExpiresAt,
      watermarkStamp,
    };
  }

  /**
   * Validates ephemeral download token authenticity and expiration
   */
  public validateDownloadToken(token: string): { valid: boolean; purchaseId?: string; reason?: string } {
    try {
      const [encodedPayload, signature] = token.replace("DL-", "").split(".");
      if (!encodedPayload || !signature) {
        return { valid: false, reason: "Malformed token format" };
      }

      const rawPayload = Buffer.from(encodedPayload, "base64url").toString("utf8");
      const [purchaseId, , expiryTimestamp] = rawPayload.split(":");

      const expectedSignature = createHmac("sha256", this.signingSecret)
        .update(rawPayload)
        .digest("hex")
        .substring(0, 24);

      if (signature !== expectedSignature) {
        return { valid: false, reason: "Cryptographic signature verification failed" };
      }

      if (Date.now() > Number(expiryTimestamp)) {
        return { valid: false, reason: "Download token expired (15-minute SLA breached)" };
      }

      return { valid: true, purchaseId };
    } catch {
      return { valid: false, reason: "Token parsing exception" };
    }
  }
}
