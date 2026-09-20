/**
 * @canonical-root File-15: 15_05_MAIN_ENGINES_TRANSACTION_CORE
 * @child-ext      File-14: 14_04_SUB_FEATURE_EXTERNAL_INTEGRATIONS
 * @child-ext      File-16: 16_06_SUB_ENGINES_SERVICES
 * @tier           Tier-3 Core Business & Financial Engines
 * @domain         Domain-05 Trading Core & Domain-04 Integrations
 * @zero-loss-rule Replaceable Broker Interface & Anti-Corruption Layer
 */

import { ServiceResult } from "../../core/contracts";

export type OrderSide = "BUY" | "SELL";
export type OrderType = "MARKET" | "LIMIT";
export type OrderStatus = "PENDING" | "SUBMITTED" | "FILLED" | "CANCELLED" | "REJECTED";

export interface BrokerOrderRequest {
  symbol: string;
  quantity: number;
  side: OrderSide;
  type: OrderType;
  price?: number;
  idempotencyKey: string;
}

export interface BrokerOrderResponse {
  brokerOrderId: string;
  clientOrderId: string;
  status: OrderStatus;
  filledQuantity: number;
  averagePrice: number;
  timestamp: string;
}

export interface BrokerPosition {
  symbol: string;
  quantity: number;
  averagePrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
}

export interface IBrokerAdapter {
  getBrokerName(): string;
  authenticate(): Promise<ServiceResult<{ authenticated: boolean }>>;
  placeOrder(order: BrokerOrderRequest): Promise<ServiceResult<BrokerOrderResponse>>;
  getOrderStatus(brokerOrderId: string): Promise<ServiceResult<BrokerOrderResponse>>;
  cancelOrder(brokerOrderId: string): Promise<ServiceResult<{ cancelled: boolean }>>;
  getPositions(): Promise<ServiceResult<BrokerPosition[]>>;
}
