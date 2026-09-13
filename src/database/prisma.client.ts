/**
 * @canonical-root File-11: 11_01_MAIN_BASE_SCHEMA
 * @child-ext      NONE
 * @tier           Tier-1
 * @domain         Domain-00 to Domain-07
 * @zero-loss-rule Invariant validated against master specification
 */

import { PrismaClient } from "@prisma/client";

declare global {
  // Prevent multiple instances of Prisma Client in development runtime
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

const createPrismaClient = (): PrismaClient => {
  return new PrismaClient({
    log:
      process.env["NODE_ENV"] === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
};

export const prisma: PrismaClient =
  globalThis.prismaGlobal ?? createPrismaClient();

if (process.env["NODE_ENV"] !== "production") {
  globalThis.prismaGlobal = prisma;
}

export default prisma;
