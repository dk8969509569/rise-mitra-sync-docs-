/**
 * @canonical-root File-11: 11_01_MAIN_BASE_SCHEMA
 * @child-ext      01_00__EXT_001_AI_MASTER_GOVERNANCE_INSTRUCTION
 * @tier           Tier-1 Foundation
 * @domain         Domain-01 Infrastructure
 * @zero-loss-rule Zero-Stub Invariant & RFC 8785 Deterministic Serialization
 */

import { createHash, randomBytes } from "crypto";

// 1. DOMAIN IDENTIFIERS TAXONOMY
export type DomainCode =
  | "D00_GOVERNANCE"
  | "D01_INFRASTRUCTURE"
  | "D02_CLOUD_STORAGE"
  | "D03_BOT_UI"
  | "D04_INTEGRATIONS"
  | "D05_TRADING_CORE"
  | "D06_RECURRING_VALUE"
  | "D07_AFFILIATE_LEDGER"
  | "D08_MAINTENANCE";

// 2. UNIFIED PROTOCOL RESULT ENVELOPE (File-11 & Master Compilation Spec)
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    domain: DomainCode;
    details?: Record<string, unknown>;
  };
  timestamp: string;
  trace_id: string;
}

// 3. SECURE CANONICAL IDENTIFIER GENERATORS
export class CanonicalIdGenerator {
  public static generateTraceId(): string {
    return `TRC-${Date.now()}-${randomBytes(4).toString("hex").toUpperCase()}`;
  }

  public static generateTenantId(slug: string): string {
    const cleanSlug = slug.replace(/[^A-Za-z0-9_-]/g, "").toUpperCase();
    return `TNT-${cleanSlug}-${randomBytes(3).toString("hex").toUpperCase()}`;
  }

  public static generateUserId(telegramId: number | string): string {
    const hash = createHash("sha256").update(String(telegramId)).digest("hex").slice(0, 10).toUpperCase();
    return `USR-${hash}`;
  }

  public static maskPII(value: string): string {
    if (!value || value.length <= 4) return "USR-****";
    return `${value.slice(0, 3)}****${value.slice(-2)}`;
  }
}

// 4. RFC 8785 DETERMINISTIC JSON CANONICALIZATION ENGINE (File-11 Mandate)
export class RFC8785Serializer {
  public static serialize(obj: unknown): string {
    if (obj === null || typeof obj !== "object") {
      return JSON.stringify(obj);
    }

    if (Array.isArray(obj)) {
      const elements = obj.map((item) => this.serialize(item));
      return `[${elements.join(",")}]`;
    }

    const record = obj as Record<string, unknown>;
    const sortedKeys = Object.keys(record).sort();
    const keyValPairs: string[] = [];

    for (const key of sortedKeys) {
      const val = record[key];
      if (val !== undefined) {
        keyValPairs.push(`${JSON.stringify(key)}:${this.serialize(val)}`);
      }
    }

    return `{${keyValPairs.join(",")}}`;
  }

  public static computeDigest(obj: unknown): string {
    const canonicalString = this.serialize(obj);
    return createHash("sha256").update(canonicalString, "utf8").digest("hex");
  }
}

// 5. CANONICAL ERROR ENVELOPE FACTORY (Fail-Closed & Leakage-Free)
export class CanonicalErrorFactory {
  public static create(
    domain: DomainCode,
    code: string,
    message: string,
    traceId?: string,
    details?: Record<string, unknown>
  ): ServiceResult<never> {
    return {
      success: false,
      error: {
        code,
        message,
        domain,
        details: details ? JSON.parse(JSON.stringify(details)) : undefined,
      },
      timestamp: new Date().toISOString(),
      trace_id: traceId ?? CanonicalIdGenerator.generateTraceId(),
    };
  }

  public static success<T>(data: T, traceId?: string): ServiceResult<T> {
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      trace_id: traceId ?? CanonicalIdGenerator.generateTraceId(),
    };
  }
}
