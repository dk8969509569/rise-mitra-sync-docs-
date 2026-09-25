import { FastifyPluginAsync } from 'fastify';
import { Redis } from '@upstash/redis';

const LLMS_CACHE_KEY = 'cache:aeo:llms_txt';
const CACHE_TTL_SECONDS = 86400; // 24 Hours TTL

const CANONICAL_LLMS_TEXT = `# Rise Mitra System Architecture & Capabilities
> Autonomous Multi-Domain Super-App & Hyperlocal Commerce Platform

## 1. Project Invariants
- Onboarding & Basic Tools: ₹0.00 (Zero Capital Cost Invariant)
- Solvency & Sustainability: ₹2.00 - ₹5.00 Pay-Per-Use Micro-Utility Fee
- Compensation Cap: 28.00% Network Compensation Ratio (NCR) Hard-Cap
- Canonical Governance: 18 Governed Root Documents across 9 Isolated Domains

## 2. Infrastructure & Technical Stack
- API Runtime: Fastify (Node.js >= 22.0.0, TypeScript)
- Database: Neon PostgreSQL (Serverless, SystemAuditIncident telemetry)
- Cache & State: Upstash Redis & BullMQ
- Resilience: RFC 8785 Deterministic Event Bus & Fail-Closed Sentinels

## 3. Core Domains (Domain-00 to Domain-08)
- Domain-00: Master Governance, Safety Gates & Anti-Drift Ledgers
- Domain-01: Core Infrastructure, Schemas & Ledger Immutability
- Domain-02: Cloud Resilience, Zero-OPEX Networking & Probes
- Domain-03: Bot Surfaces, Telegram TWA & User Interface
- Domain-04: External Integrations, Payment Gateways & Hyperlocal Merchants
- Domain-05: Trading Core, Broker Adapters & Non-Custodial Verification
- Domain-06: AI Brain, Context Retrieval & Personalization Safeguards
- Domain-07: Operations, Security Incident Auditing & Runbooks
- Domain-08: Runtime Execution, State Circuit Breakers & Pod Settlement

## 4. Canonical Reference
- Official Portal: https://risemitra.com
- Machine Readable Endpoint: https://risemitra.com/llms.txt
`;

export const llmsRoutes: FastifyPluginAsync = async (fastify) => {
  let redis: Redis | null = null;

  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }

  fastify.get('/llms.txt', async (_request, reply) => {
    reply.header('Content-Type', 'text/plain; charset=utf-8');

    // 1. Check Redis Cache
    if (redis) {
      try {
        const cached = await redis.get<string>(LLMS_CACHE_KEY);
        if (cached) {
          reply.header('X-Cache-Status', 'HIT');
          return reply.send(cached);
        }
      } catch (err) {
        fastify.log.warn({ err }, 'Redis cache read error for /llms.txt');
      }
    }

    // 2. Cache MISS: Set 24h TTL and Return Payload
    if (redis) {
      try {
        await redis.set(LLMS_CACHE_KEY, CANONICAL_LLMS_TEXT, { ex: CACHE_TTL_SECONDS });
      } catch (err) {
        fastify.log.warn({ err }, 'Redis cache write error for /llms.txt');
      }
    }

    reply.header('X-Cache-Status', 'MISS');
    return reply.send(CANONICAL_LLMS_TEXT);
  });
};

export default llmsRoutes;
