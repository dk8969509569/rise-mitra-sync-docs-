/**
 * @canonical-root File-11: 11_01_MAIN_BASE_SCHEMA
 * @child-ext      NONE
 * @tier           Tier-1
 * @domain         Domain-00 to Domain-07
 * @zero-loss-rule Invariant validated against master specification
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // 1. Seed Domain-00 System Invariant Configs
  await prisma.d00_SystemConfig.upsert({
    where: { key: "SYSTEM_STATUS" },
    update: {},
    create: {
      key: "SYSTEM_STATUS",
      value: "ACTIVE_NORMAL",
      is_encrypted: false,
      updated_by: "SYSTEM_INIT",
    },
  });

  await prisma.d00_SystemConfig.upsert({
    where: { key: "NCR_MAX_CAP_PERCENT" },
    update: {},
    create: {
      key: "NCR_MAX_CAP_PERCENT",
      value: "28.00",
      is_encrypted: false,
      updated_by: "SYSTEM_INIT",
    },
  });

  await prisma.d00_SystemConfig.upsert({
    where: { key: "MERCHANT_COMMISSION_PERCENT" },
    update: {},
    create: {
      key: "MERCHANT_COMMISSION_PERCENT",
      value: "0.00",
      is_encrypted: false,
      updated_by: "SYSTEM_INIT",
    },
  });

  // 2. Seed Domain-00 AI Governance Directives
  await prisma.d00_AiGovernanceDirective.upsert({
    where: { directive_code: "DIR_ZERO_STUB" },
    update: {},
    create: {
      directive_code: "DIR_ZERO_STUB",
      category: "CODE_INTEGRITY",
      rule_content: "All code generated must be 100% complete with zero stubs or placeholders.",
      is_active: true,
    },
  });

  await prisma.d00_AiGovernanceDirective.upsert({
    where: { directive_code: "DIR_STATUTORY_COMPLIANCE" },
    update: {},
    create: {
      directive_code: "DIR_STATUTORY_COMPLIANCE",
      category: "LEGAL_GUARD",
      rule_content: "Strict adherence to Direct Selling Rules 2021, DPDP Act 2025, and SEBI education disclaimer.",
      is_active: true,
    },
  });

  // 3. Seed Domain-03 Base Plans
  await prisma.d03_SubscriptionPlan.upsert({
    where: { plan_code: "PLAN_COMMUNITY_FREE" },
    update: {},
    create: {
      plan_code: "PLAN_COMMUNITY_FREE",
      name: "Community Member",
      price_fiat: 0.00,
      validity_days: 365,
      is_active: true,
    },
  });

  await prisma.d03_SubscriptionPlan.upsert({
    where: { plan_code: "PLAN_PRO_MONTHLY" },
    update: {},
    create: {
      plan_code: "PLAN_PRO_MONTHLY",
      name: "Pro Analytics Monthly",
      price_fiat: 999.00,
      validity_days: 30,
      is_active: true,
    },
  });
}

main()
  .catch((e: unknown) => {
    // eslint-disable-next-line no-console
    console.error("Database seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
