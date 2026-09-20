/**
 * @canonical-root File-15: 15_05_MAIN_ENGINES_TRANSACTION_CORE
 * @child-ext      File-14: 14_04_SUB_FEATURE_EXTERNAL_INTEGRATIONS
 * @child-ext      File-16: 16_06_SUB_ENGINES_SERVICES
 * @tier           Tier-3 Core Business & Financial Engines
 * @domain         Domain-01 Trading & Domain-04 Integrations
 * @zero-loss-rule DhanHQ REST Execution Adapter & Circuit Breaker Guard
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

export interface DhanConfig {
  clientId?: string;
  accessToken?: string;
  baseUrl?: string;
}

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export class DhanAdapter implements IBrokerAdapter {
  private readonly clientId: string;
  private readonly accessToken: string;
  private readonly baseUrl: string;

  // Circuit Breaker State
  private failureCount: number = 0;
  private circuitState: CircuitState = "CLOSED";
  private lastFailureTime: number = 0;
  private readonly failureThreshold: number = 3;
  private readonly cooldownPeriodMs: number = 60000; // 60 seconds

  constructor(config?: DhanConfig) {
    this.clientId = config?.clientId || process.env["DHAN_CLIENT_ID"] || "";
    this.accessToken = config?.accessToken || process.env["DHAN_ACCESS_TOKEN"] || "";
    this.baseUrl = config?.baseUrl || "https://api.dhan.co/v2";
  }

  public getBrokerName(): string {
    return "DHAN";
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
      "access-token": this.accessToken,
      "client-id": this.clientId,
    };
  }

  public async authenticate(): Promise<ServiceResult<{ authenticated: boolean }>> {
    const traceId = CanonicalIdGenerator.generateTraceId();

    if (!this.clientId || !this.accessToken) {
      return CanonicalErrorFactory.create(
        "D01_TRADING",
        "DHAN_AUTH_CREDENTIALS_MISSING",
        "Dhan client_id or access_token missing in environment.",
        traceId
      );
    }

    if (!this.checkCircuit()) {
      return CanonicalErrorFactory.create(
        "D01_TRADING",
        "DHAN_CIRCUIT_OPEN",
        "Dhan adapter circuit breaker is OPEN. Cooldown in progress.",
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
          `DHAN_AUTH_HTTP_${response.status}`,
          `Authentication request to Dhan failed with HTTP status ${response.status}`,
          traceId
        );
      }

      this.recordSuccess();
      return CanonicalErrorFactory.success({ authenticated: true }, traceId);
    } catch (error) {
      this.recordFailure();
      const message = error instanceof Error ? error.message : "Dhan authentication network failure";
      return CanonicalErrorFactory.create(
        "D01_TRADING",
        "DHAN_AUTH_EXCEPTION",
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
        "DHAN_CIRCUIT_OPEN",
        "Cannot place order. Dhan circuit breaker is OPEN.",
        traceId
      );
    }

    try {
      const payload = {
        dhanClientId: this.clientId,
        correlationId: order.idempotencyKey,
        transactionType: order.side,
        exchangeSegment: "NSE_EQ",
        productType: "INTRADAY",
        orderType: order.type,
        validity: "DAY",
        tradingSymbol: order.symbol,
        securityId: order.symbol,
        quantity: order.quantity,
        price: order.price ?? 0,
      };

      const response = await fetch(`${this.baseUrl}/orders`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        this.recordFailure();
        return CanonicalErrorFactory.create(
          "D01_TRADING",
          `DHAN_ORDER_HTTP_${response.status}`,
          `Order placement failed on Dhan with status ${response.status}`,
          traceId
        );
      }

      const result = (await response.json()) as {
        orderId?: string;
        orderStatus?: string;
      };

      this.recordSuccess();

      const orderResponse: BrokerOrderResponse = {
        brokerOrderId: result.orderId || `DHAN-${Date.now()}`,
        clientOrderId: order.idempotencyKey,
        status: this.mapOrderStatus(result.orderStatus),
        filledQuantity: order.type === "MARKET" ? order.quantity : 0,
        averagePrice: order.price ?? 0,
        timestamp: new Date().toISOString(),
      };

      return CanonicalErrorFactory.success(orderResponse, traceId);
    } catch (error) {
      this.recordFailure();
      const message = error instanceof Error ? error.message : "Dhan order placement error";
      return CanonicalErrorFactory.create(
        "D01_TRADING",
        "DHAN_PLACE_ORDER_EXCEPTION",
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
        "DHAN_CIRCUIT_OPEN",
        "Dhan circuit breaker is OPEN.",
        traceId
      );
    }

    try {
      const response = await fetch(`${this.baseUrl}/orders/${brokerOrderId}`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        this.recordFailure();
        return CanonicalErrorFactory.create(
          "D01_TRADING",
          `DHAN_STATUS_HTTP_${response.status}`,
          `Failed to retrieve order status from Dhan. HTTP ${response.status}`,
          traceId
        );
      }

      const result = (await response.json()) as {
        orderId: string;
        correlationId?: string;
        orderStatus: string;
        filledQty?: number;
        price?: number;
      };

      this.recordSuccess();

      const orderResponse: BrokerOrderResponse = {
        brokerOrderId: result.orderId,
        clientOrderId: result.correlationId || "UNKNOWN",
        status: this.mapOrderStatus(result.orderStatus),
        filledQuantity: result.filledQty ?? 0,
        averagePrice: result.price ?? 0,
        timestamp: new Date().toISOString(),
      };

      return CanonicalErrorFactory.success(orderResponse, traceId);
    } catch (error) {
      this.recordFailure();
      const message = error instanceof Error ? error.message : "Dhan order status error";
      return CanonicalErrorFactory.create(
        "D01_TRADING",
        "DHAN_ORDER_STATUS_EXCEPTION",
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
        "DHAN_CIRCUIT_OPEN",
        "Dhan circuit breaker is OPEN.",
        traceId
      );
    }

    try {
      const response = await fetch(`${this.baseUrl}/orders/${brokerOrderId}`, {
        method: "DELETE",
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        this.recordFailure();
        return CanonicalErrorFactory.create(
          "D01_TRADING",
          `DHAN_CANCEL_HTTP_${response.status}`,
          `Order cancellation rejected by Dhan. HTTP ${response.status}`,
          traceId
        );
      }

      this.recordSuccess();
      return CanonicalErrorFactory.success({ cancelled: true }, traceId);
    } catch (error) {
      this.recordFailure();
      const message = error instanceof Error ? error.message : "Dhan cancel order error";
      return CanonicalErrorFactory.create(
        "D01_TRADING",
        "DHAN_CANCEL_ORDER_EXCEPTION",
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
        "DHAN_CIRCUIT_OPEN",
        "Dhan circuit breaker is OPEN.",
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
          `DHAN_POSITIONS_HTTP_${response.status}`,
          `Failed to fetch positions from Dhan. HTTP ${response.status}`,
          traceId
        );
      }

      const rawPositions = (await response.json()) as Array<{
        tradingSymbol?: string;
        securityId?: string;
        netQty?: number;
        costPrice?: number;
        unrealizedProfit?: number;
        realizedProfit?: number;
      }>;

      this.recordSuccess();

      const positions: BrokerPosition[] = (rawPositions || []).map((pos) => ({
        symbol: pos.tradingSymbol || pos.securityId || "UNKNOWN",
        quantity: pos.netQty ?? 0,
        averagePrice: pos.costPrice ?? 0,
        unrealizedPnl: pos.unrealizedProfit ?? 0,
        realizedPnl: pos.realizedProfit ?? 0,
      }));

      return CanonicalErrorFactory.success(positions, traceId);
    } catch (error) {
      this.recordFailure();
      const message = error instanceof Error ? error.message : "Dhan positions fetch error";
      return CanonicalErrorFactory.create(
        "D01_TRADING",
        "DHAN_POSITIONS_EXCEPTION",
        message,
        traceId
      );
    }
  }

  private mapOrderStatus(status?: string): OrderStatus {
    switch (status?.toUpperCase()) {
      case "TRANSIT":
      case "PENDING":
        return "PENDING";
      case "CONFIRM":
      case "SUBMITTED":
        return "SUBMITTED";
      case "TRADED":
      case "FILLED":
        return "FILLED";
      case "CANCELLED":
        return "CANCELLED";
      case "REJECTED":
        return "REJECTED";
      default:
        return "SUBMITTED";
    }
  }
}

export default DhanAdapter;
