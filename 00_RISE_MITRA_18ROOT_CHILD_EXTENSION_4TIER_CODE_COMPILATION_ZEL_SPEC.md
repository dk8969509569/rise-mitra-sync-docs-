================================================================================
RISE MITRA — 4-TIER RUNTIME COMPILATION & CANONICAL MAPPING SPECIFICATION
================================================================================
DOCUMENT ID     : SPEC-ARCH-4TIER-COMPILATION-V7-AUTONOMOUS-MASTER-COMPLETE
SYSTEM TARGET   : RISE MITRA MULTI-DOMAIN TELEGRAM BOT & HYBRID APPLICATION
GOVERNANCE REF  : 01_00_OWNER_MASTER_CONTROL_DASHBOARD_RISE_MITRA
CANONICAL SCOPE : 18 ROOT CANONICAL BLUEPRINTS + 7 ACTIVE CHILD EXTENSIONS
TOTAL BLUEPRINTS: 25 CANONICAL ARTIFACTS
ISOLATION MODEL : 8-DOMAIN REPOSITORY ARCHITECTURAL ISOLATION (DOMAIN 00 TO 07)
EXECUTION MODE  : UNATTENDED HYPER-FAST AUTONOMOUS AI SYNTHESIS (100% AUTO-RUN)
OBJECTIVE       : 100% ZERO ELEMENT LOSS (ZEL), TOKEN-SAFE BATCH EXECUTION
================================================================================

1. AUTONOMOUS AI CODING DIRECTIVES & TOKEN-SAFE EXECUTION LAWS
--------------------------------------------------------------------------------
When executing in Auto-Mode, the AI Agent acts as a Principal Autonomous Systems 
Engineer and must strictly enforce these invariants without human intervention:

1. ZERO-STUB INVARIANT (NO PLACEHOLDERS):
   Never emit partial code, ellipses (`...`), `// TODO: implement later`, or mock 
   stubs returning dummy values. Every handler, database model, calculation engine, 
   network tree visualizer, and middleware must be 100% production-implemented.
2. TOKEN-SAFE TIER CHUNKING:
   To prevent LLM output token exhaustion (context clipping), the AI must synthesize 
   the codebase strictly tier-by-tier following the 4-Stage Execution Harness in 
   Section 11. Never attempt to generate all 4 tiers in a single prompt.
3. CONTINUOUS DETERMINISTIC BUILD GATES:
   Gate 1 (Tier-1 DB) ---> Gate 2 (Tier-2 UI) ---> Gate 3 (Tier-3 Engine) ---> Gate 4 (Tier-4 Governance)
   The AI automatically triggers compilation checks at each gate and advances only 
   when the current tier compiles with zero errors.
4. AUTONOMOUS SELF-HEALING LOOP:
   If TypeScript compilation (`tsc --noEmit`) or Prisma validation fails at any point, 
   the AI must autonomously read the error stack, patch the schema or type declaration, 
   and re-test until clean compilation is achieved, without human intervention.
5. DOMAIN ISOLATION BARRIER & EVENT BUS:
   Modules belonging to Domain-01 (Trading) or Domain-03 (Billing) must NEVER query 
   Domain-07 (Affiliates) tables directly. All cross-domain data movement MUST pass 
   via the Redis-backed Event Bus (`event.bus.ts`) and Tier-4 Gateway.
6. CANONICAL HEADER ENFORCEMENT:
   Every generated `.ts`, `.sql`, or `.json` file MUST contain the Section 12 header.

--------------------------------------------------------------------------------
2. PRODUCTION TECH STACK & RUNTIME CONSTRAINTS (STRICT LOCK)
--------------------------------------------------------------------------------
- Runtime Environment : Node.js v20+ LTS / TypeScript v5.3+ (Strict Mode: true)
- Database Layer      : PostgreSQL 15+ via Prisma ORM v5.x
- Caching & Queues    : Redis (ioredis v5.x) + BullMQ v5.x for async workers & event bus
- Telegram Bot Core   : grammY v1.21+ (with @grammyjs/conversations, @grammyjs/runner,
                        and @grammyjs/hydrate)
- Bot Connection Mode : Concurrent Long-Polling via @grammyjs/runner (Zero Webhook SSL dependency)
- Broker SDKs         : DhanHQ REST/WebSocket SDK, Fyers API v3, CCXT (Binance/Delta)
- Cloud Storage SDK   : AWS S3 SDK / Cloudflare R2 client (@aws-sdk/client-s3)
- HTTP & Webhooks     : Fastify v4.x (for high-speed TradingView & payment webhook ingestion)
- Mini-App Static UI  : Fastify Static plugin serving HTML5/Tailwind visualizer views
- Validation Engine   : Zod v3.22+ for runtime payload validation
- Logging & Sentry    : Pino Logger v8.x (Structured JSON with trace_id)

--------------------------------------------------------------------------------
3. 8-DOMAIN BOUNDARY & ISOLATION MATRIX (CANONICAL SCOPE)
--------------------------------------------------------------------------------
- DOMAIN-00: Master Governance, Safety & Core Directives (File-01, 01_00__EXT_001)
- DOMAIN-01: Market Data, Technical Analysis & Algorithmic Trading (File-15, File-16)
- DOMAIN-02: Legal Framework, Risk Disclaimers & Compliance (File-03)
- DOMAIN-03: Billing, Invoices, Subscriptions & Payment Gateways (File-04)
- DOMAIN-04: Bot UX, Community & Customer AI Interactions (File-05, File-13, File-14)
- DOMAIN-05: Creator AI Studio, Content Generation & Broadcast (File-06)
- DOMAIN-06: Value Retention, Lifecycle & Recurring Automation (File-07, File-10)
- DOMAIN-07: Affiliate Matrix, Lock-in, Tree View & Payouts (File-08, 08_00__EXT_001-006)

--------------------------------------------------------------------------------
4. THE 4-TIER RUNTIME COMPILATION MATRIX (25 ARTIFACTS MAPPING)
--------------------------------------------------------------------------------

### TIER 1: DATA, STORAGE & SCHEMA FOUNDATION
* Scope: Complete relational entities, state caches, cloud storage, audit trails.
* Canonical Root Files:
  - File-11: 11_01_MAIN_BASE_SCHEMA
  - File-12: 12_02_SUB_BASE_CLOUD_STORAGE
* Mandatory Prisma Model Mapping (22 Production Models):
  - Domain-00: `D00_SystemConfig`, `D00_OwnerAuditLog`, `D00_AiGovernanceDirective`
  - Domain-01: `D01_TradingSignal`, `D01_TradeOrder`, `D01_BrokerAccount`, `D01_Position`
  - Domain-02: `D02_UserConsent`, `D02_DisclaimerAudit`
  - Domain-03: `D03_SubscriptionPlan`, `D03_UserSubscription`, `D03_PaymentInvoice`
  - Domain-04: `D04_TelegramUser`, `D04_UserSessionFsm`, `D04_SupportTicket`
  - Domain-05: `D05_CreatorContent`, `D05_BroadcastQueue`
  - Domain-06: `D06_UserStreak`, `D06_RetentionMetric`, `D06_ScheduledTask`
  - Domain-07: `D07_AffiliateProfile`, `D07_AffiliateLedger`, `D07_LockinSchedule`,
               `D07_DiversificationReward`, `D07_PayoutRequest`, `D07_PayoutAuditTrail`
* Partner Network Tree Lineage Columns:
  - `D07_AffiliateProfile` MUST include:
    * `sponsor_id`: UUID (Self-referencing Foreign Key to parent affiliate)
    * `tree_path`: String (Materialized Path index, e.g., "/root_id/sponsor_id/user_id")
    * `tree_depth`: Integer (0 for root, 1 for direct, 2 for sub, etc.)
    * `direct_referrals_count`: Integer (Default 0)
    * `total_downline_count`: Integer (Default 0)
    * `total_team_volume`: DECIMAL(12, 2) (Cumulative volume for rank progression)
* Precision Invariant:
  All crypto quantities use `DECIMAL(18, 8)`; fiat amounts use `DECIMAL(12, 2)`.
* Destination: `/prisma/schema.prisma`, `/src/database/`, `/src/cache/`, `/src/storage/`

---

### TIER 2: TELEGRAM BOT ENGINE, MINI-APP & INTERACTIVE UI/UX
* Scope: grammY bot router, interactive keyboards, conversational FSM wizards, visual tree.
* Canonical Root Files:
  - File-13: 13_03_MAIN_FEATURE_TELEGRAM_BOT
  - File-14: 14_04_SUB_FEATURE_UI_UX
  - File-05: 05_00_CUSTOMER_AI_ENGAGEMENT
* Integrated Interfaces:
  - User Commands: `/start`, `/menu`, `/dashboard`, `/trade`, `/signals`, `/wallet`, `/affiliate`, `/tree`, `/help`
  - Owner Commands: `/admin`, `/killswitch`, `/emergency`, `/broadcast`, `/status`
  - Visual Network Tree Interface:
    * Renders 3-Level Downline hierarchy in Unicode/Emoji branching format
    * Shows partner rank, active/inactive indicator, and generation level
    * Paginated interactive drill-down buttons (`[◀ L1]`, `[L2]`, `[L3 ▶]`, `[🔍 Inspect Node]`)
    * Telegram Mini App (TMA) Webview button opening interactive graphical genealogy canvas
  - FSM Conversations:
    * `onboardingWizard`: Terms consent, language selection, welcome guide
    * `brokerConnectWizard`: API Key & Secret ingestion with input masking
    * `payoutRequestWizard`: UPI/Wallet address input and OTP/confirmation check
* Destination: `/src/bot/handlers/`, `/src/bot/keyboards/`, `/src/bot/scenes/`, `/src/bot/templates/`, `/src/webapp/`

---

### TIER 3: CORE BUSINESS, TRADING, BILLING, RETENTION & AUTOMATION ENGINES
* Scope: Broker connectors, payment gateways, cron schedulers, webhook ingestion, retention.
* Canonical Root Files:
  - File-15: 15_05_MAIN_ENGINES_TRADING_CORE
  - File-16: 16_06_SUB_ENGINES_SERVICES
  - File-04: 04_00_FINANCIAL_FRAMEWORK_BILLING
  - File-06: 06_00_CREATOR_AI_STUDIO
  - File-07: 07_00_RECURRING_VALUE_ENGINE
  - File-10: 10_00_AUTOMATION_ORCHESTRATION
  - File-18: 18_08_SUB_OPERATIONS_MAINTENANCE
* Integrated Engines:
  - Webhook Ingestion (`/api/v1/webhook/signals`): Fastify server receiving signals with Zod validation
  - Payment Ingestion (`/api/v1/webhook/payments`): Razorpay / UPI / Crypto USDT instant confirmation
  - Unified Broker Adapters: Dhan (REST/WS), Fyers v3, Binance (CCXT), Delta Exchange (CCXT)
  - Risk Engine: Pre-order max drawdown monitor, max lots guard, mandatory Stop-Loss & Take-Profit
  - Retention Engine: Streak calculation, daily check-in points, activity milestones (File-07)
  - Schedulers (BullMQ):
    * `cron-lockin-settlement`: Daily at 00:00 UTC (processes 30-day maturity from 08_00__EXT_002/003)
    * `cron-streak-updater`: Daily user retention & activity evaluation (File-07)
    * `cron-market-summary`: Generates and queues AI market reports (File-06)
    * `cron-db-backup`: Automated daily database backup and WAL rotation (File-18)
* Destination: `/src/services/trading/`, `/src/services/brokers/`, `/src/services/billing/`, `/src/services/retention/`, `/src/jobs/`

---

### TIER 4: GOVERNANCE, SECURITY, AFFILIATE LOGIC & OWNER CONTROL
* Scope: 3-level kill-switch, RBAC, affiliate compensation & network tree engine.
* Canonical Root Files:
  - File-01: 01_00_OWNER_MASTER_CONTROL_DASHBOARD_RISE_MITRA
  - File-02: 02_00_MISSION_VISION_VALUES
  - File-03: 03_00_LEGAL_SECURITY_COMPLIANCE
  - File-08: 08_00_PARTNER_PROGRAM_AFFILIATE
  - File-09: 09_00_ELEMENT_DOMAIN_ISOLATION
  - File-17: 17_07_MAIN_OPERATIONS_MONITORING
* File-08 Child Extensions & Tree Engine Specifications:
  - `08_00__EXT_001`: Direct referral (Tier-1: 30%), Tier-2 (10%), Tier-3 (5%) compensation
  - `08_00__EXT_002`: 30-day mandatory lock-in period for all accrued commission balances
  - `08_00__EXT_003`: Automated transition of locked funds to 'WITHDRAWABLE' upon day 31
  - `08_00__EXT_004`: Bonus point multipliers for multi-domain bot engagement
  - `08_00__EXT_005`: Dynamic tier upgrades based on active downline volume & team size
  - `08_00__EXT_006`: Automated fraud check, velocity limits, and min payout threshold (₹500 / 10 USDT)
  - `Network Tree Engine`: Recursive upline/downline traversal across tree_path with depth filtering
* File-03 Legal Compliance Middleware:
  - Injects mandatory disclaimer to every outbound trade alert:
    *"Disclaimer: For educational purposes only. Not financial advice. Rise Mitra is not a SEBI-registered advisor."*
* Destination: `/src/governance/`, `/src/middleware/`, `/src/services/affiliate/`

--------------------------------------------------------------------------------
5. 3-LEVEL OWNER EMERGENCY KILL-SWITCH SPECIFICATION
--------------------------------------------------------------------------------
Controlled exclusively via File-01 (Owner Telegram ID Authorization):
- LEVEL 1 (SOFT PAUSE):
  Stops new trade signal generation. Active positions remain monitored. Bot UI informs 
  users: "System under routine maintenance."
- LEVEL 2 (HARD KILL):
  Immediately closes or squares off open broker positions, cancels all pending limit 
  orders, halts affiliate payout releases, and pauses all cron workers.
- LEVEL 3 (PANIC ISOLATION):
  Disconnects all broker API sessions, locks database into READ-ONLY mode, flushes 
  sensitive cache keys from Redis, and restricts bot access strictly to the Owner ID.

--------------------------------------------------------------------------------
6. CANONICAL GRANULAR CODE DIRECTORY TREE (EXACT FILE-BY-FILE BLUEPRINT)
--------------------------------------------------------------------------------
```text
rise-mitra/
├── .env.example                                    # Environment variable contract
├── 00_RISE_MITRA_18ROOT_CHILD_EXTENSION_4TIER_CODE_COMPILATION_ZEL_SPEC.md
├── docker-compose.yml                              # PostgreSQL 15 + Redis 7 runtime
├── Dockerfile                                      # Node.js 20 production container
├── package.json                                    # Node manifest with auto scripts
├── tsconfig.json                                   # Strict TypeScript compiler config
├── prisma/
│   └── schema.prisma                               # TIER 1: 22 Models (D00 to D07 + Tree Lineage)
└── src/
    ├── index.ts                                    # Master runtime bootstrap orchestrator
    ├── config/
    │   ├── env.config.ts                           # Zod-validated environment config
    │   └── constants.ts                            # Domain IDs, Error codes, Precisions
    ├── database/                                   # TIER 1: Storage Layer (File-11)
    │   ├── prisma.client.ts                        # Singleton Prisma client instance
    │   └── seed.ts                                 # Master seed (Directives & Plans)
    ├── cache/                                      # TIER 1: Redis Caching (File-12)
    │   ├── redis.client.ts                         # Redis connection pool
    │   └── session.store.ts                        # Bot session & token store adapter
    ├── storage/                                    # TIER 1: Cloud Object Storage (File-12)
    │   └── storage.service.ts                      # S3 / Cloudflare R2 / Local file storage
    ├── events/                                     # TIER 1 & 4: Cross-Domain Event Bus (File-09/10)
    │   ├── event.bus.ts                            # Redis PubSub / EventEmitter hub
    │   └── event.types.ts                          # Strict event payloads (Domain Isolation)
    ├── bot/                                        # TIER 2: UI & Telegram Bot (File-13, 14, 05, 01)
    │   ├── bot.instance.ts                         # grammY bot setup (hydrate + runner)
    │   ├── handlers/
    │   │   ├── start.handler.ts                    # /start onboarding command
    │   │   ├── menu.handler.ts                     # /menu interactive dashboard
    │   │   ├── trade.handler.ts                    # /trade broker execution router
    │   │   ├── signals.handler.ts                  # /signals feed & manual review
    │   │   ├── affiliate.handler.ts                # /affiliate overview & referral links
    │   │   ├── network-tree.handler.ts             # /tree interactive downline genealogy viewer
    │   │   ├── owner-admin.handler.ts              # /admin, /killswitch, /emergency (File-01)
    │   │   └── help.handler.ts                     # /help & documentation guide
    │   ├── keyboards/
    │   │   ├── main.keyboard.ts                    # Dynamic main menu inline grid
    │   │   ├── trade.keyboard.ts                   # Trade execution & lot selector
    │   │   ├── affiliate.keyboard.ts               # Affiliate dashboard & payout buttons
    │   │   ├── tree.keyboard.ts                    # Interactive tree pagination & drill-down grid
    │   │   └── admin.keyboard.ts                   # Owner master control dashboard buttons
    │   ├── scenes/
    │   │   ├── onboarding.scene.ts                 # Registration & terms consent wizard
    │   │   ├── broker-connect.scene.ts             # Masked broker API key ingestion
    │   │   └── payout-request.scene.ts             # UPI / USDT withdrawal form wizard
    │   └── templates/
    │       ├── message.template.ts                 # MarkdownV2 escaped system alerts
    │       ├── alert.template.ts                   # Standardized signal alert cards
    │       └── tree.template.ts                    # Unicode/Emoji Network Tree Visualizer
    ├── webapp/                                     # TIER 2: Telegram Mini App Frontend (File-14)
    │   └── public/
    │       ├── index.html                          # TMA Entry Point
    │       ├── tree-viewer.html                    # Visual interactive network tree canvas
    │       └── app.js                              # Telegram WebApp SDK initializer
    ├── services/                                   # TIER 3 & 4: Business Logic
    │   ├── trading/                                # TIER 3: Trading Engines (File-15, 16)
    │   │   ├── signal.processor.ts                 # Webhook signal parser & router
    │   │   ├── risk.guard.ts                       # Max drawdown, lot size & SL guard
    │   │   └── order.router.ts                     # Multi-broker order dispatcher
    │   ├── brokers/                                # TIER 3: Broker Connectors
    │   │   ├── broker.interface.ts                 # Universal Broker Contract
    │   │   ├── dhan.adapter.ts                     # DhanHQ REST & WebSocket client
    │   │   ├── fyers.adapter.ts                    # Fyers API v3 client
    │   │   ├── binance.adapter.ts                  # Binance Spot/Futures CCXT client
    │   │   └── delta.adapter.ts                    # Delta Exchange India client
    │   ├── billing/                                # TIER 3: Payment Gateways (File-04)
    │   │   ├── payment.interface.ts                # Payment provider contract
    │   │   ├── razorpay.adapter.ts                 # UPI / Card gateway adapter
    │   │   └── crypto.adapter.ts                   # USDT (TRC20/BEP20) gateway adapter
    │   ├── retention/                              # TIER 3: Recurring Value Engine (File-07)
    │   │   └── streak.service.ts                   # User streaks, loyalty XP & reward tiers
    │   ├── ai/                                     # TIER 3: AI Studios (File-06, 05)
    │   │   ├── creator.studio.ts                   # Technical market summary generator
    │   │   └── customer.assistant.ts               # In-bot user support AI assistant
    │   └── affiliate/                              # TIER 4: Affiliate Logic (File-08/EXT-001-006)
    │       ├── commission.calc.ts                  # Multi-Tier (30%/10%/5%) engine (EXT-001/005)
    │       ├── lockin.manager.ts                   # 30-day lock-in retention tracker (EXT-002/003)
    │       ├── rewards.engine.ts                   # Cross-domain activity multiplier (EXT-004)
    │       ├── payout.auditor.ts                   # Min limit, velocity & fraud audit (EXT-006)
    │       └── network.tree.service.ts             # Genealogy traversal & downline aggregation
    ├── jobs/                                       # TIER 3: Schedulers & BullMQ (File-10, 18)
    │   ├── queue.manager.ts                        # BullMQ queues initialization
    │   └── workers/
    │       ├── lockin-settlement.worker.ts         # Daily 00:00 UTC maturity cron
    │       ├── streak-updater.worker.ts            # Daily engagement & streak tracker (File-07)
    │       ├── content-broadcast.worker.ts         # Periodic market broadcast queue (File-06)
    │       └── db-backup.worker.ts                 # Automated daily DB backup worker (File-18)
    ├── server/                                     # TIER 3: Signal & Payment Webhook Server
    │   ├── fastify.server.ts                       # High-speed Fastify HTTP server
    │   └── routes/
    │       ├── webhook.signal.ts                   # /api/v1/webhook/signals endpoint
    │       └── webhook.payment.ts                  # /api/v1/webhook/payments endpoint
    ├── governance/                                 # TIER 4: Owner Governance (File-01, 09)
    │   ├── killswitch.service.ts                   # 3-Level Emergency Control Engine
    │   └── domain.gateway.ts                       # 8-Domain boundary isolation guard
    ├── middleware/                                 # TIER 4: Auth & Compliance (File-02, 03)
    │   ├── auth.middleware.ts                      # RBAC (Owner, Admin, Member, Guest)
    │   ├── rate-limit.middleware.ts                # Redis token bucket rate limiter
    │   └── compliance.middleware.ts                # Mandatory SEBI & risk disclaimer injector
    └── monitoring/                                 # TIER 4: Operations Monitoring (File-17)
        ├── logger.ts                               # Pino structured JSON logger with trace_id
        └── sentry.alerts.ts                        # Telegram Sentry heartbeat & alerts
```

--------------------------------------------------------------------------------
7. PRODUCTION DOCKER-COMPOSE RUNTIME (docker-compose.yml)
--------------------------------------------------------------------------------
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    container_name: rise_postgres
    restart: always
    environment:
      POSTGRES_USER: risemitra
      POSTGRES_PASSWORD: risepassword123
      POSTGRES_DB: risemitra_prod
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: rise_redis
    restart: always
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

--------------------------------------------------------------------------------
8. MANDATORY PACKAGE.JSON MANIFEST (AUTO-INSTALL CONTRACT)
--------------------------------------------------------------------------------
```json
{
  "name": "rise-mitra-bot",
  "version": "1.0.0",
  "description": "Rise Mitra Multi-Domain Autonomous Telegram Bot & Trading Super-App",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts",
    "typecheck": "tsc --noEmit",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "auto:tier1": "prisma generate && tsc --noEmit",
    "auto:tier2": "tsc --noEmit",
    "auto:tier3": "tsc --noEmit",
    "auto:tier4": "tsc --noEmit && npm run build",
    "auto:pipeline": "prisma generate && prisma db push && tsc && node dist/index.js"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.525.0",
    "@fastify/static": "^6.12.0",
    "@grammyjs/conversations": "^1.1.2",
    "@grammyjs/hydrate": "^1.4.1",
    "@grammyjs/runner": "^2.0.3",
    "@prisma/client": "^5.10.2",
    "bullmq": "^5.4.1",
    "ccxt": "^4.2.55",
    "dotenv": "^16.4.5",
    "fastify": "^4.26.1",
    "grammy": "^1.21.1",
    "ioredis": "^5.3.2",
    "pino": "^8.19.0",
    "pino-pretty": "^10.3.1",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/node": "^20.11.24",
    "prisma": "^5.10.2",
    "tsx": "^4.7.1",
    "typescript": "^5.3.3"
  }
}
```

--------------------------------------------------------------------------------
9. MANDATORY ENVIRONMENT CONTRACT (.env.example)
--------------------------------------------------------------------------------
```bash
# SYSTEM CORE
NODE_ENV=production
PORT=3000
APP_NAME=RiseMitraBot
WEBAPP_URL=[https://app.risemitra.com](https://app.risemitra.com)

# GOVERNANCE & OWNER (TIER 4)
OWNER_TELEGRAM_ID=0000000000
KILL_SWITCH_STATUS=ACTIVE_NORMAL # ACTIVE_NORMAL | LEVEL_1_PAUSE | LEVEL_2_HARD_KILL | LEVEL_3_PANIC

# TIER 1: DATABASE, CACHE & STORAGE
DATABASE_URL=postgresql://risemitra:risepassword123@localhost:5432/risemitra_prod?schema=public
REDIS_URL=redis://default:@localhost:6379
STORAGE_S3_BUCKET=risemitra-storage
STORAGE_S3_ENDPOINT=[https://your-endpoint.r2.cloudflarestorage.com](https://your-endpoint.r2.cloudflarestorage.com)
STORAGE_ACCESS_KEY=your_storage_key
STORAGE_SECRET_KEY=your_storage_secret

# TIER 2: TELEGRAM BOT
TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ

# TIER 3: BROKER & WEBHOOK CREDENTIALS
WEBHOOK_SECRET=rise_mitra_tradingview_webhook_secret_key
DHAN_CLIENT_ID=your_dhan_client_id
DHAN_ACCESS_TOKEN=your_dhan_access_token
FYERS_APP_ID=your_fyers_app_id
FYERS_ACCESS_TOKEN=your_fyers_access_token
BINANCE_API_KEY=your_binance_api_key
BINANCE_API_SECRET=your_binance_api_secret
DELTA_EXCHANGE_API_KEY=your_delta_key
DELTA_EXCHANGE_API_SECRET=your_delta_secret

# TIER 3: PAYMENT GATEWAYS
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
CRYPTO_RECEIVING_ADDRESS=your_usdt_wallet_address
```

--------------------------------------------------------------------------------
10. UNIFIED RESULT ENVELOPE & WEBHOOK SCHEMA
--------------------------------------------------------------------------------
```typescript
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    domain: string;
  };
  timestamp: string;
  trace_id: string;
}

export interface TradingViewWebhookPayload {
  ticker: string;
  action: "BUY" | "SELL";
  entry_price: number;
  stop_loss: number;
  target_1: number;
  target_2?: number;
  timeframe: string;
  secret: string;
}
```

--------------------------------------------------------------------------------
11. AUTONOMOUS 4-STAGE PROMPT HARNESS & BATCH EXECUTION PIPELINE
--------------------------------------------------------------------------------
To prevent context truncation and ensure 100% Zero Element Loss, the human or 
agent runner must feed the synthesis tasks in these 4 sequential batches:

### PROMPT BATCH 1: TIER-1 FOUNDATION EXECUTION
"Act as Principal Autonomous Systems Engineer. Using 00_SPEC.md:
1. Synthesize `package.json`, `tsconfig.json`, `docker-compose.yml`, and `.env.example`.
2. Generate the complete `prisma/schema.prisma` containing all 22 models across Domain 00-07.
   Ensure `D07_AffiliateProfile` includes `sponsor_id`, `tree_path`, and `tree_depth`.
3. Implement `src/database/prisma.client.ts`, `src/database/seed.ts`, `src/cache/redis.client.ts`,
   and `src/storage/storage.service.ts`.
4. Run validation gate: `npm run auto:tier1` and self-heal any relation errors."

### PROMPT BATCH 2: TIER-2 BOT RUNTIME & UI INTERFACES
"Act as Principal Autonomous Systems Engineer. Using 00_SPEC.md:
1. Synthesize `src/bot/bot.instance.ts` using grammY runner and hydrate plugins.
2. Implement all handlers: `start`, `menu`, `trade`, `signals`, `affiliate`, `network-tree`,
   and `owner-admin` handlers.
3. Build all keyboards, FSM conversation scenes (`onboarding`, `broker-connect`, `payout-request`),
   and the visual tree template `src/bot/templates/tree.template.ts`.
4. Create the Telegram Mini App static view: `src/webapp/public/tree-viewer.html`.
5. Run validation gate: `npm run auto:tier2` and self-heal any typing drifts."

### PROMPT BATCH 3: TIER-3 TRADING, BROKERS, BILLING & WORKERS
"Act as Principal Autonomous Systems Engineer. Using 00_SPEC.md:
1. Synthesize Fastify server: `src/server/fastify.server.ts` and routes for TradingView 
   and payment webhooks.
2. Implement broker adapters: `dhan.adapter.ts`, `fyers.adapter.ts`, `binance.adapter.ts`,
   and `delta.adapter.ts` implementing `broker.interface.ts`.
3. Implement `risk.guard.ts`, `order.router.ts`, `streak.service.ts`, and payment gateways.
4. Implement all BullMQ workers: `lockin-settlement`, `streak-updater`, `content-broadcast`,
   and `db-backup.worker.ts`.
5. Run validation gate: `npm run auto:tier3` and self-heal any parameter issues."

### PROMPT BATCH 4: TIER-4 GOVERNANCE, MASTER ENTRY & FULL LOCK
"Act as Principal Autonomous Systems Engineer. Using 00_SPEC.md:
1. Synthesize `killswitch.service.ts` (L1, L2, L3) and `domain.gateway.ts`.
2. Implement `commission.calc.ts`, `lockin.manager.ts`, `rewards.engine.ts`, `payout.auditor.ts`,
   and `network.tree.service.ts` (Recursive Genealogy Engine).
3. Implement `auth.middleware.ts`, `rate-limit.middleware.ts`, and `compliance.middleware.ts`.
4. Build master bootstrap: `src/index.ts` bringing up DB, Redis, Fastify, Schedulers, and Bot.
5. Run final gate: `npm run auto:pipeline` ensuring 0 TypeScript and runtime errors."

--------------------------------------------------------------------------------
12. TRACEABILITY PROTOCOL & CANONICAL TAGGING (ZERO ELEMENT LOSS)
--------------------------------------------------------------------------------
Every single file created in the codebase MUST begin with this header:

```typescript
/**
 * @canonical-root File-XX (e.g., File-11: 11_01_MAIN_BASE_SCHEMA)
 * @child-ext      08_00__EXT_001_INCOME_DISTRIBUTION_FRAMEWORK (or NONE)
 * @tier           Tier-1 | Tier-2 | Tier-3 | Tier-4
 * @domain         Domain-00 to Domain-07
 * @zero-loss-rule Invariant validated against master specification
 */
```
================================================================================
--------------------------------------------------------------------------------
13. WORLD-CLASS ENTERPRISE RESILIENCE, FINTECH INTEGRITY & NFR SPECIFICATION
--------------------------------------------------------------------------------
To match Fortune-500 enterprise standards (Amazon, Google, Stripe, Zerodha), 
the codebase must enforce these 6 non-negotiable architectural mandates:

1. DOUBLE-ENTRY LEDGER & FINANCIAL INVARIANTS (DOMAIN-03 & DOMAIN-07):
   - Every financial transaction (subscription billing, affiliate commission 
     distribution, withdrawal payout) must record immutable paired DEBIT and CREDIT rows.
   - Database Invariant Check:
     User_Available_Balance + User_Locked_Balance == SUM(Credit_Entries) - SUM(Debit_Entries)
   - Discrepancy Prevention:
     Direct manual balance increments via SQL `UPDATE balance = balance + X` 
     without an associated ledger event are strictly forbidden by database triggers.

2. IDEMPOTENCY & ORDER DEDUPLICATION ENGINE (DOMAIN-01 & DOMAIN-03):
   - Inbound TradingView signals and payment webhooks must compute a cryptographic hash:
     Idempotency_Key = SHA256(ticker + action + timeframe + price_bucket + minute_epoch)
   - Redis Atomic Guard:
     Acquires an atomic distributed lock via Redis `SET key value NX EX 60`.
   - If key exists, the request returns HTTP 200 `{ status: "DEDUPLICATED", code: 20001 }` 
     and exits immediately without dispatching duplicate orders or charges.

3. ZERO-TRUST SECRETS & AES-256-GCM ENCRYPTION (DOMAIN-00 & DOMAIN-01):
   - Broker API Keys, API Secrets, and user payment tokens must never be written 
     to the database in plaintext.
   - Encryption Standard:
     AES-256-GCM with a dynamic 96-bit Initialization Vector (IV) and 128-bit 
     Authentication Tag per record.
   - Master Encryption Key (MEK) is loaded exclusively into memory from secure 
     environment memory or cloud KMS (Key Management Service) and never logged.
   - Telemetry Masking:
     Pino Logger and Telegram Sentry must automatically scrub secrets, API keys, 
     passwords, and Telegram session tokens (`****`) before emitting JSON logs.

4. BROKER CIRCUIT BREAKER PATTERN (DOMAIN-01 SERVICES):
   - Circuit State Machine: CLOSED (Normal) -> OPEN (Tripped) -> HALF-OPEN (Recovery).
   - Trip Threshold:
     If a broker adapter (Dhan, Fyers, Binance, Delta) returns 3 consecutive HTTP 429 
     (Rate Limit), 503 (Unavailable), or timeouts (> 3000ms), trip state to OPEN for 60 seconds.
   - In OPEN state:
     Reject new order submissions immediately with fallback notification, square off 
     existing stops if emergency levels breached, and prevent cascade connection exhaustion.

5. NON-FUNCTIONAL REQUIREMENTS (NFR), LATENCY BUDGET & CONCURRENCY SLA:
   - Signal-to-Broker Latency Target:
     * Webhook Ingress to Parser: < 15ms
     * Risk Engine & Drawdown Validation: < 20ms
     * Broker REST/WS Dispatch: < 85ms
     * Total p95 Latency: < 120ms | Total p99 Latency: < 250ms
   - Concurrency Capacity:
     Support 10,000 active Telegram user sessions and 500 concurrent webhook events/sec.
   - Graceful Shutdown Trap:
     Node.js process captures `SIGTERM`/`SIGINT`, halts worker job consumption, 
     flushes Redis event buffers, waits for in-flight broker responses (max 10s), 
     and cleanly terminates DB connection pools.

6. PAPER TRADING SIMULATOR & DISASTER RECOVERY MATRIX:
   - Sandbox Simulation Layer:
     Every user may toggle `execution_mode: "PAPER" | "LIVE"`. Paper mode routes 
     orders to a synthetic matching engine simulating actual market tick slippage (0.05%) 
     and fill latency without risking real capital.
   - Disaster Recovery Targets:
     * Recovery Point Objective (RPO) = 0 (Continuous PostgreSQL WAL replication).
     * Recovery Time Objective (RTO) < 5 minutes (Auto-restarting container health checks).
--------------------------------------------------------------------------------

