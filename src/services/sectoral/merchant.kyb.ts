/**
 * @canonical-root File-10 (10_00_AUTOMATION_ORCHESTRATION_RISE_MITRA)
 * @child-ext      File-14 (14_04_SUB_FEATURE_EXTERNAL_INTEGRATIONS)
 * @tier           Tier-3
 * @domain         Domain-04 & Domain-06
 * @zero-loss-rule Zero Commission Invariant (0.00%) & Autonomous License Expiry Sentinel
 */

import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "crypto";
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  base: { service: "MerchantKYB-Service", domain: "Domain-04" },
});

export interface MerchantOnboardInput {
  userId: string;
  sectorCode: string;
  businessName: string;
  tradeLicenseNo?: string;
  gstin?: string;
  fssaiNo?: string;
  licenseExpiryDate?: Date;
  isSponsoredFee?: boolean;
}

export interface KYBValidationResult {
  merchantId: string;
  businessName: string;
  kybStatus: "PENDING" | "VERIFIED" | "SUSPENDED";
  commissionPct: number;
  expiryWarning?: string;
}

export class MerchantKYBService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
  }

  /**
   * Onboards a local merchant with hard-coded 0.00% commission constraint
   */
  public async onboardMerchant(input: MerchantOnboardInput): Promise<KYBValidationResult> {
    logger.info({ userId: input.userId, sectorCode: input.sectorCode }, "Initiating Merchant Onboarding");

    // 1. Resolve Sector Registry
    const sector = await this.prisma.d04_SectorRegistry.findUnique({
      where: { sector_code: input.sectorCode },
    });

    if (!sector || !sector.is_active) {
      throw new Error(`Sector code '${input.sectorCode}' is either inactive or not registered.`);
    }

    // 2. Enforce 0.00% Platform Commission Invariant (Zero-Commission Boundary)
    const merchant = await this.prisma.d04_MerchantProfile.create({
      data: {
        user_id: input.userId,
        sector_id: sector.id,
        business_name: input.businessName,
        trade_license_no: input.tradeLicenseNo || null,
        gstin: input.gstin || null,
        fssai_no: input.fssaiNo || null,
        kyb_status: "PENDING",
        license_expiry_date: input.licenseExpiryDate || null,
        product_margin_pct: 0.00, // Hard Invariant: ₹0 joining, 0% platform markup
        is_sponsored_fee: input.isSponsoredFee || false,
        is_active: true,
      },
    });

    // 3. Create Immutable Audit Log
    const auditPayload = JSON.stringify({
      merchantId: merchant.id,
      userId: input.userId,
      sectorCode: input.sectorCode,
      margin: "0.00%",
    });

    await this.prisma.d00_OwnerAuditLog.create({
      data: {
        action: "MERCHANT_ONBOARD_INITIATED",
        actor_id: input.userId,
        target_domain: "DOMAIN_04_SECTORAL",
        payload_hash: createHash("sha256").update(auditPayload).digest("hex"),
        details: `Merchant profile registered: ${merchant.business_name} under sector ${input.sectorCode}`,
        timestamp: new Date(),
      },
    });

    logger.info({ merchantId: merchant.id }, "Merchant profile recorded with 0% commission lock");

    return {
      merchantId: merchant.id,
      businessName: merchant.business_name,
      kybStatus: "PENDING",
      commissionPct: 0.00,
    };
  }

  /**
   * Evaluates trade license expiry and autonomously enforces Fail-Closed suspension
   */
  public async evaluateLicenseStatus(merchantId: string): Promise<KYBValidationResult> {
    const merchant = await this.prisma.d04_MerchantProfile.findUnique({
      where: { id: merchantId },
    });

    if (!merchant) {
      throw new Error(`Merchant with ID ${merchantId} not found.`);
    }

    const now = new Date();
    let warning: string | undefined = undefined;

    if (merchant.license_expiry_date) {
      const msDiff = merchant.license_expiry_date.getTime() - now.getTime();
      const daysDiff = Math.ceil(msDiff / (1000 * 60 * 60 * 24));

      // Automated Fail-Closed suspension upon expiry
      if (daysDiff <= 0) {
        await this.prisma.d04_MerchantProfile.update({
          where: { id: merchantId },
          data: {
            kyb_status: "SUSPENDED",
            is_active: false,
          },
        });

        logger.warn({ merchantId, daysDiff }, "Merchant license expired. Autonomous suspension enacted.");
        return {
          merchantId: merchant.id,
          businessName: merchant.business_name,
          kybStatus: "SUSPENDED",
          commissionPct: 0.00,
          expiryWarning: "EXPIRED: Account suspended under Fail-Closed safety invariant.",
        };
      }

      // Early Warning System (T-30, T-7, T-1)
      if (daysDiff <= 30) {
        warning = `WARNING: License expires in ${daysDiff} day(s). Action required to prevent suspension.`;
      }
    }

    return {
      merchantId: merchant.id,
      businessName: merchant.business_name,
      kybStatus: merchant.kyb_status as "PENDING" | "VERIFIED" | "SUSPENDED",
      commissionPct: Number(merchant.product_margin_pct),
      expiryWarning: warning,
    };
  }

  /**
   * Daily scheduled sweep across active merchants to flag expiring licenses
   */
  public async scanExpiringLicensesCron(): Promise<{ scanned: number; suspended: number }> {
    logger.info("Executing daily autonomous merchant license expiry sentinel");
    const activeMerchants = await this.prisma.d04_MerchantProfile.findMany({
      where: { is_active: true },
      take: 200,
    });

    let suspended = 0;
    for (const merchant of activeMerchants) {
      const evaluation = await this.evaluateLicenseStatus(merchant.id);
      if (evaluation.kybStatus === "SUSPENDED") {
        suspended++;
      }
    }

    logger.info({ scanned: activeMerchants.length, suspended }, "Daily merchant license audit complete");
    return { scanned: activeMerchants.length, suspended };
  }
}
