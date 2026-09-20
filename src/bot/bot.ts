/**
 * @canonical-root File-13: 13_03_MAIN_FEATURE_BOT_INTERFACE
 * @child-ext      File-12: 12_02_SUB_BASE_CLOUD_STORAGE
 * @child-ext      01_00__EXT_004_UNIFIED_ZEL_CORRECTION_ROADMAP
 * @tier           Tier-2 Ingress Surface
 * @domain         Domain-03 Bot UI & User Journeys
 * @zero-loss-rule Persistent Redis Session Adapter & 9-Card Navigation
 */

import { Bot, Context, session, SessionFlavor } from "grammy";
import {
  CanonicalErrorFactory,
  CanonicalIdGenerator,
  RFC8785Serializer,
  ServiceResult,
} from "../core/contracts";
import {
  createNineCardMenuKeyboard,
  handleMenuCommand,
  handleMenuCallback,
} from "./handlers/menu.handler";
import { RedisSessionStore } from "../cache/session.store";

export interface BotSessionData {
  userId: string;
  step: string;
  currentDomain: string;
  lastNonce?: string;
}

export type BotContext = Context & SessionFlavor<BotSessionData>;

export const createBotInstance = (token?: string): Bot<BotContext> => {
  const botToken = token || process.env["TELEGRAM_BOT_TOKEN"] || "DUMMY_TOKEN_FOR_SCAFFOLDING";
  const bot = new Bot<BotContext>(botToken);

  // 1. Session Middleware (Backed by RedisSessionStore for persistent FSM state)
  bot.use(
    session({
      initial: (): BotSessionData => ({
        userId: "USR-ANONYMOUS",
        step: "IDLE",
        currentDomain: "D03_BOT_UI",
      }),
      storage: new RedisSessionStore<BotSessionData>({
        ttlSeconds: 86400, // 24-hour persistence
        keyPrefix: "rm:session:bot:",
      }),
    })
  );

  // 2. Telemetry and Traceability Middleware (Fail-Closed & Leak-Free)
  bot.use(async (ctx, next) => {
    const traceId = CanonicalIdGenerator.generateTraceId();
    const fromId = ctx.from?.id ? CanonicalIdGenerator.generateUserId(ctx.from.id) : "USR-UNKNOWN";
    ctx.session.userId = fromId;

    const ingressPayload = {
      traceId,
      userId: fromId,
      updateType: ctx.update.update_id,
      timestamp: new Date().toISOString(),
    };
    RFC8785Serializer.computeDigest(ingressPayload);

    await next();
  });

  // 3. Command: /start (Dual-Mission Gateway & 9-Card Menu Anchor)
  bot.command("start", async (ctx) => {
    const welcomeText =
      "🌟 *Rise Mitra Super-App Gateway*\n\n" +
      "स्वास्थ्य और स्वावलंबन का संप्रभु मंच:\n" +
      "• *हेल्थ पिलर*: सुरक्षित मन, स्वस्थ शरीर, सुरक्षित डेटा\n" +
      "• *वेल्थ पिलर*: सुरक्षित पूँजी, निखरा हुनर, सतत आत्मनिर्भरता\n\n" +
      "मुख्य नेविगेशन लोड करने के लिए नीचे दिए गए मेनू से सेवा चुनें या `/menu` टाइप करें:";

    await ctx.reply(welcomeText, {
      parse_mode: "Markdown",
      reply_markup: createNineCardMenuKeyboard(),
    });
  });

  // 4. Command: /menu (9-Card Main Navigation Console)
  bot.command("menu", handleMenuCommand);

  // 5. Interactive Callback Dispatcher (9-Card Navigation Router)
  bot.on("callback_query:data", handleMenuCallback);

  // 6. Global Bot Error Boundary (Fail-Closed Catch-All)
  bot.catch((err) => {
    const ctx = err.ctx;
    const error = err.error;
    const traceId = CanonicalIdGenerator.generateTraceId();
    console.error(`[Domain-03 Bot Error] Trace: ${traceId}`, error);
    void ctx.reply(`⚠️ [Domain-03 Fail-Closed] सेवा अस्थायी रूप से बाधित है। Trace: \`${traceId}\``, {
      parse_mode: "Markdown",
    });
  });

  return bot;
};

export default createBotInstance;
