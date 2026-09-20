/**
 * @canonical-root File-15: 15_05_MAIN_ENGINES_TRANSACTION_CORE
 * @child-ext      File-14: 14_04_SUB_FEATURE_EXTERNAL_INTEGRATIONS
 * @child-ext      File-16: 16_06_SUB_ENGINES_SERVICES
 * @tier           Tier-3 Core Business & Financial Engines
 * @domain         Domain-01 Trading & Domain-04 Integrations
 * @zero-loss-rule Fyers API v3 REST Execution Adapter & Circuit Breaker Guard
 */

import {
  CanonicalErrorFactory,
  CanonicalIdGenerator,
  ServiceResult,
} from "../../core/contracts";
import {
  IBrokerAdapter,
  BrokerOrderRequest,
  BrokerOrderResponse,
  BrokerPosition,
  OrderStatus,
} from "./broker.interface";

export interface FyersConfig {
  appId?: string;
  accessToken?: string;
  baseUrl?: string;
}

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export class FyersAdapter implements IBrokerAdapter {
  private readonly appId: string;
  private readonly accessToken: string;
  private readonly baseUrl: string;

  // Circuit Breaker State
  private failureCount: number = 0;
  private circuitState: CircuitState = "CLOSED";
  private lastFailureTime: number = 0;
  private readonly failureThreshold: number = 3;
  private readonly cooldownPeriodMs: number = 60000; // 60 seconds

  constructor(config?: FyersConfig) {
    this.appId = config?.appId || process.env["FYERS_APP_ID"] || "";
    this.accessToken = config?.accessToken || process.env["FYERS_ACCESS_TOKEN"] || "";
    this.baseUrl = config?.baseUrl || "https://api-t1.fyers.in/api/v3";
  }

  public getBrokerName(): string {
    return "FYERS";
  }

  private checkCircuit(): boolean {
    const now = Date.now();
    if (this.circuitState === "OPEN") {
      if (now - this.lastFailureTime > this.cooldownPeriodMs) {
        this.circuitState = "HALF_OPEN";
        return true;
      }
      return false;
    }
    return true;
  }

  private recordSuccess(): void {
    this.failureCount = 0;
    this.circuitState = "CLOSED";
  }

  private recordFailure(): void {
    this.failureCount += 1;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.failureThreshold) {
      this.circuitState = "OPEN";
    }
  }

  private getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `${this.appId}:${this.accessToken}`,
    };
  }

  public async authenticate(): Promise<ServiceResult<{ authenticated: boolean }>> {
    const traceId = CanonicalIdGenerator.generateTraceId();

    if (!this.appId || !this.accessToken) {
      return CanonicalErrorFactory.create(
        "D01_TRADING",
        "FYERS_AUTH_CREDENTIALS_MISSING",
        "Fyers app_id or access_token missing in environment.",
        traceId
      );
    }

    if (!this.checkCircuit()) {
      return CanonicalErrorFactory.create(
        "D01_TRADING",
        "FYERS_CIRCUIT_OPEN",
        "Fyers adapter circuit breaker is OPEN. Cooldown in progress.",
        traceId
      );
    }

    try {
      const response = await fetch(`${this.baseUrl}/profile`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        this.recordFailure();
        return CanonicalErrorFactory.create(
          "D01_TRADING",
          `FYERS_AUTH_HTTP_${response.status}`,
          `Authentication request to Fyers failed with HTTP status ${response.status}`,
          traceId
        );
      }

      const result = (await response.json()) as { s?: string };
      if (result.s !== "ok") {
        this.recordFailure();
        return CanonicalErrorFactory.create(
          "D01_TRADING",
          "FYERS_AUTH_REJECTED",
          "Fyers profile authentication response was not 'ok'.",
          traceId
        );
      }

      this.recordSuccess();
      return CanonicalErrorFactory.success({ authenticated: true }, traceId);
    } catch (error) {
      this.recordFailure();
      const message = error instanceof Error ? error.message : "Fyers authentication network failure";
      return CanonicalErrorFactory.create(
        "D01_TRADING",
        "FYERS_AUTH_EXCEPTION",
        message,
        traceId
      );
    }
  }

  public async placeOrder(
    order: BrokerOrderRequest
  ): Promise<ServiceResult<BrokerOrderResponse>> {
    const traceId = CanonicalIdGenerator.generateTraceId();

    if (!this.checkCircuit()) {
      return CanonicalErrorFactory.create(
        "D01_TRADING",
        "FYERS_CIRCUIT_OPEN",
        "Cannot place order. Fyers circuit breaker is OPEN.",
        traceId
      );
    }

    try {
      const payload = {
        symbol: order.symbol,
        qty: order.quantity,
        type: order.type === "MARKET" ? 2 : 1, // Fyers v3: 1 => Limit, 2 => Market
        side: order.side === "BUY" ? 1 : -1,  // Fyers v3: 1 => Buy, -1 => Sell
        productType: "INTRADAY",
        limitPrice: order.price ?? 0,
        stopPrice: 0,
        validity: "DAY",
        disclosedQty: 0,
        offlineOrder: false,
        stopLoss: 0,
        takeProfit: 0,
      };

      const response = await fetch(`${this.baseUrl}/orders/sync`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        this.recordFailure();
        return CanonicalErrorFactory.create(
          "D01_TRADING",
          `FYERS_ORDER_HTTP_${response.status}`,
          `Order placement failed on Fyers with status ${response.status}`,
          traceId
        );
      }

      const result = (await response.json()) as {
        s?: string;
        id?: string;
        message?: string;
      };

      if (result.s !== "ok") {
        this.recordFailure();
        return CanonicalErrorFactory.create(
          "D01_TRADING",
          "FYERS_ORDER_REJECTED",
          result.message || "Fyers rejected order placement.",
          traceId
        );
      }

      this.recordSuccess();

      const orderResponse: BrokerOrderResponse = {
        brokerOrderId: result.id || `FYERS-${Date.now()}`,
        clientOrderId: order.idempotencyKey,
        status: "SUBMITTED",
        filledQuantity: order.type === "MARKET" ? order.quantity : 0,
        averagePrice: order.price ?? 0,
        timestamp: new Date().toISOString(),
      };

      return CanonicalErrorFactory.success(orderResponse, traceId);
    } catch (error) {
      this.recordFailure();
      const message = error instanceof Error ? error.message : "Fyers order placement error";
      return CanonicalErrorFactory.create(
        "D01_TRADING",
        "FYERS_PLACE_ORDER_EXCEPTION",
        message,
        traceId
      );
    }
  }

  public async getOrderStatus(
    brokerOrderId: string
  ): Promise<ServiceResult<BrokerOrderResponse>> {
    const traceId = CanonicalIdGenerator.generateTraceId();

    if (!this.checkCircuit()) {
      return CanonicalErrorFactory.create(
        "D01_TRADING",
        "FYERS_CIRCUIT_OPEN",
        "Fyers circuit breaker is OPEN.",
        traceId
      );
    }

    try {
      const response = await fetch(`${this.baseUrl}/orders?id=${brokerOrderId}`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        this.recordFailure();
        return CanonicalErrorFactory.create(
          "D01_TRADING",
          `FYERS_STATUS_HTTP_${response.status}`,
          `Failed to retrieve order status from Fyers. HTTP ${response.status}`,
          traceId
        );
      }

      const result = (await response.json()) as {
        s?: string;
        orderBook?: Array<{
          id: string;
          status: number;
          filledQty: number;
          tradedPrice: number;
        }>;
      };

      const matchedOrder = result.orderBook?.find((o) => o.id === brokerOrderId);
      if (!matchedOrder) {
        return CanonicalErrorFactory.create(
          "D01_TRADING",
          "FYERS_ORDER_NOT_FOUND",
          `Order ${brokerOrderId} not found in Fyers order book.`,
          traceId
        );
      }

      this.recordSuccess();

      const orderResponse: BrokerOrderResponse = {
        brokerOrderId: matchedOrder.id,
        clientOrderId: "UNKNOWN",
        status: this.mapFyersStatus(matchedOrder.status),
        filledQuantity: matchedOrder.filledQty ?? 0,
        averagePrice: matchedOrder.tradedPrice ?? 0,
        timestamp: new Date().toISOString(),
      };

      return CanonicalErrorFactory.success(orderResponse, traceId);
    } catch (error) {
      this.recordFailure();
      const message = error instanceof Error ? error.message : "Fyers order status error";
      return CanonicalErrorFactory.create(
        "D01_TRADING",
        "FYERS_ORDER_STATUS_EXCEPTION",
        message,
        traceId
      );
    }
  }

  public async cancelOrder(
    brokerOrderId: string
  ): Promise<ServiceResult<{ cancelled: boolean }>> {
    const traceId = CanonicalIdGenerator.generateTraceId();

    if (!this.checkCircuit()) {
      return CanonicalErrorFactory.create(
        "D01_TRADING",
        "FYERS_CIRCUIT_OPEN",
        "Fyers circuit breaker is OPEN.",
        traceId
      );
    }

    try {
      const response = await fetch(`${this.baseUrl}/orders/sync`, {
        method: "DELETE",
        headers: this.getHeaders(),
        body: JSON.stringify({ id: brokerOrderId }),
      });

      if (!response.ok) {
        this.recordFailure();
        return CanonicalErrorFactory.create(
          "D01_TRADING",
          `FYERS_CANCEL_HTTP_${response.status}`,
          `Order cancellation rejected by Fyers. HTTP ${response.status}`,
          traceId
        );
      }

      const result = (await response.json()) as { s?: string; message?: string };
      if (result.s !== "ok") {
        this.recordFailure();
        return CanonicalErrorFactory.create(
          "D01_TRADING",
          "FYERS_CANCEL_REJECTED",
          result.message || "Failed to cancel order on Fyers.",
          traceId
        );
      }

      this.recordSuccess();
      return CanonicalErrorFactory.success({ cancelled: true }, traceId);
    } catch (error) {
      this.recordFailure();
      const message = error instanceof Error ? error.message : "Fyers cancel order error";
      return CanonicalErrorFactory.create(
        "D01_TRADING",
        "FYERS_CANCEL_ORDER_EXCEPTION",
        message,
        traceId
      );
    }
  }

  public async getPositions(): Promise<ServiceResult<BrokerPosition[]>> {
    const traceId = CanonicalIdGenerator.generateTraceId();

    if (!this.checkCircuit()) {
      return CanonicalErrorFactory.create(
        "D01_TRADING",
        "FYERS_CIRCUIT_OPEN",
        "Fyers circuit breaker is OPEN.",
        traceId
      );
    }

    try {
      const response = await fetch(`${this.baseUrl}/positions`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        this.recordFailure();
        return CanonicalErrorFactory.create(
          "D01_TRADING",
          `FYERS_POSITIONS_HTTP_${response.status}`,
          `Failed to fetch positions from Fyers. HTTP ${response.status}`,
          traceId
        );
      }

      const result = (await response.json()) as {
        s?: string;
        netPositions?: Array<{
          symbol: string;
          netQty: number;
          avgPrice: number;
          unrealizedProfit: number;
          realized_profit: number;
        }>;
      };

      this.recordSuccess();

      const positions: BrokerPosition[] = (result.netPositions || []).map((pos) => ({
        symbol: pos.symbol || "UNKNOWN",
        quantity: pos.netQty ?? 0,
        averagePrice: pos.avgPrice ?? 0,
        unrealizedPnl: pos.unrealizedProfit ?? 0,
        realizedPnl: pos.realized_profit ?? 0,
      }));

      return CanonicalErrorFactory.success(positions, traceId);
    } catch (error) {
      this.recordFailure();
      const message = error instanceof Error ? error.message : "Fyers positions fetch error";
      return CanonicalErrorFactory.create(
        "D01_TRADING",
        "FYERS_POSITIONS_EXCEPTION",
        message,
        traceId
      );
    }
  }

  private mapFyersStatus(statusNumber?: number): OrderStatus {
    switch (statusNumber) {
      case 1:
        return "CANCELLED";
      case 2:
        return "FILLED";
      case 4:
        return "PENDING";
      case 5:
        return "REJECTED";
      case 6:
        return "SUBMITTED";
      default:
        return "SUBMITTED";
    }
  }
}

export default FyersAdapter;
