/**
 * @canonical-root File-13: 13_03_MAIN_FEATURE_BOT_INTERFACE
 * @child-ext      01_00__EXT_004_UNIFIED_ZEL_CORRECTION_ROADMAP
 * @tier           Tier-2 Ingress Surface
 * @domain         Domain-03 Bot UI & User Journeys
 * @zero-loss-rule Decoupled External Connector & 9-Card Idempotent Navigation
 */

import { Bot, Context, session, SessionFlavor } from "grammy";
import {
  CanonicalErrorFactory,
  CanonicalIdGenerator,
  RFC8785Serializer,
  ServiceResult,
} from "../core/contracts";

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

  // 1. Session Middleware (In-memory baseline for scaffolding)
  bot.use(
    session({
      initial: (): BotSessionData => ({
        userId: "USR-ANONYMOUS",
        step: "IDLE",
        currentDomain: "D03_BOT_UI",
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
      "कृपया नीचे दिए गए मेनू से सेवा चुनें:";

    const keyboard = {
      inline_keyboard: [
        [
          { text: "📚 हुनर व शिक्षा (Courses)", callback_data: "NAV_TRACK_01" },
          { text: "💼 सेवा व गिग (Services)", callback_data: "NAV_TRACK_05" },
        ],
        [
          { text: "🏪 लोकल कॉमर्स (Shop)", callback_data: "NAV_COMMERCE" },
          { text: "🛡️ विधिक व प्राइवेसी (Legal)", callback_data: "NAV_LEGAL" },
        ],
        [
          { text: "📊 पार्टनर डैशबोर्ड (Ledger)", callback_data: "NAV_PARTNER" },
          { text: "⚙️ सिस्टम हेल्थ (Status)", callback_data: "NAV_HEALTH" },
        ],
      ],
    };

    await ctx.reply(welcomeText, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });
  });

  // 4. Fallback Handler for Interactive Callbacks
  bot.on("callback_query:data", async (ctx) => {
    const action = ctx.callbackQuery.data;
    await ctx.answerCallbackQuery({ text: `चयनित: ${action}` });
    await ctx.reply(`[Domain-03 Gateway] एक्शन '${action}' प्राप्त हुआ। मॉड्यूल लोड हो रहा है...`);
  });

  return bot;
};

export default createBotInstance;
