/**
 * @canonical-root File-15: 15_05_MAIN_ENGINES_TRANSACTION_CORE
 * @child-ext      File-14: 14_04_SUB_FEATURE_EXTERNAL_INTEGRATIONS
 * @child-ext      File-16: 16_06_SUB_ENGINES_SERVICES
 * @tier           Tier-3 Core Business & Financial Engines
 * @domain         Domain-01 Trading & Domain-04 Integrations
 * @zero-loss-rule Dynamic Broker Registry, Routing & Fail-Closed Dispatch
 */

import {
  CanonicalErrorFactory,
  CanonicalIdGenerator,
  ServiceResult,
} from "../../core/contracts";
import { IBrokerAdapter } from "./broker.interface";
import { DhanAdapter } from "./dhan.adapter";
import { FyersAdapter } from "./fyers.adapter";

export class BrokerFactory {
  private static readonly adapters: Map<string, IBrokerAdapter> = new Map();
  private static isInitialized = false;

  private static initializeDefaultAdapters(): void {
    if (!this.isInitialized) {
      const dhan = new DhanAdapter();
      const fyers = new FyersAdapter();

      this.adapters.set(dhan.getBrokerName(), dhan);
      this.adapters.set(fyers.getBrokerName(), fyers);
      this.isInitialized = true;
    }
  }

  /**
   * Register a custom broker adapter into the runtime registry.
   */
  public static registerAdapter(adapter: IBrokerAdapter): void {
    this.adapters.set(adapter.getBrokerName().toUpperCase(), adapter);
  }

  /**
   * Retrieve an active broker adapter instance by its registered name.
   */
  public static getAdapter(brokerName: string): ServiceResult<IBrokerAdapter> {
    const traceId = CanonicalIdGenerator.generateTraceId();
    this.initializeDefaultAdapters();

    const normalizedName = brokerName.trim().toUpperCase();
    const adapter = this.adapters.get(normalizedName);

    if (!adapter) {
      return CanonicalErrorFactory.create(
        "D01_TRADING",
        "UNSUPPORTED_BROKER_REQUESTED",
        `Requested broker '${brokerName}' is not registered or supported. Supported: [DHAN, FYERS]`,
        traceId
      );
    }

    return CanonicalErrorFactory.success(adapter, traceId);
  }

  /**
   * List all registered and active broker names in the system.
   */
  public static getRegisteredBrokers(): string[] {
    this.initializeDefaultAdapters();
    return Array.from(this.adapters.keys());
  }
}

export default BrokerFactory;
