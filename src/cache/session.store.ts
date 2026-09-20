/**
 * @canonical-root File-12: 12_02_SUB_BASE_CLOUD_STORAGE
 * @child-ext      File-11: 11_01_MAIN_BASE_SCHEMA
 * @child-ext      01_00__EXT_004_UNIFIED_ZEL_CORRECTION_ROADMAP
 * @tier           Tier-1 Foundation
 * @domain         Domain-01 Infrastructure & Security
 * @zero-loss-rule Persistent Session State & Atomic Nonce Eviction
 */

import { StorageAdapter } from "grammy";
import { RedisService } from "./redis.client";
import { CanonicalErrorFactory, CanonicalIdGenerator } from "../core/contracts";

export interface SessionStoreOptions {
  ttlSeconds?: number;
  keyPrefix?: string;
}

export class RedisSessionStore<T> implements StorageAdapter<T> {
  private readonly ttlSeconds: number;
  private readonly keyPrefix: string;

  constructor(options?: SessionStoreOptions) {
    this.ttlSeconds = options?.ttlSeconds ?? 86400; // 24 hours default TTL
    this.keyPrefix = options?.keyPrefix ?? "rm:session:";
  }

  private formatKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  public async read(key: string): Promise<T | undefined> {
    const redis = RedisService.getClient();
    const redisKey = this.formatKey(key);
    try {
      const rawData = await redis.get(redisKey);
      if (!rawData) {
        return undefined;
      }
      return JSON.parse(rawData) as T;
    } catch (error) {
      console.error(`[Domain-01 SessionStore] Failed to read session key '${redisKey}':`, error);
      return undefined;
    }
  }

  public async write(key: string, value: T): Promise<void> {
    const redis = RedisService.getClient();
    const redisKey = this.formatKey(key);
    try {
      const serialized = JSON.stringify(value);
      if (this.ttlSeconds > 0) {
        await redis.set(redisKey, serialized, "EX", this.ttlSeconds);
      } else {
        await redis.set(redisKey, serialized);
      }
    } catch (error) {
      console.error(`[Domain-01 SessionStore] Failed to write session key '${redisKey}':`, error);
    }
  }

  public async delete(key: string): Promise<void> {
    const redis = RedisService.getClient();
    const redisKey = this.formatKey(key);
    try {
      await redis.del(redisKey);
    } catch (error) {
      console.error(`[Domain-01 SessionStore] Failed to delete session key '${redisKey}':`, error);
    }
  }

  public async touch(key: string): Promise<void> {
    if (this.ttlSeconds <= 0) return;
    const redis = RedisService.getClient();
    const redisKey = this.formatKey(key);
    try {
      await redis.expire(redisKey, this.ttlSeconds);
    } catch (error) {
      console.error(`[Domain-01 SessionStore] Failed to refresh TTL for key '${redisKey}':`, error);
    }
  }
}

export default RedisSessionStore;
