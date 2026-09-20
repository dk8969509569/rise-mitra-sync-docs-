/**
 * @canonical-root File-13: 13_03_MAIN_FEATURE_BOT_INTERFACE
 * @child-ext      File-14: 14_04_SUB_FEATURE_UI_UX
 * @tier           Tier-2 Ingress Surface
 * @domain         Domain-03 Bot UI & User Journeys
 * @zero-loss-rule 9-Card Interactive Grid & Idempotent Navigation Dispatch
 */

import { InlineKeyboard } from "grammy";
import { BotContext } from "../bot";
import {
  CanonicalErrorFactory,
  CanonicalIdGenerator,
  RFC8785Serializer,
} from "../../core/contracts";

// 1. CANONICAL 9-CARD NAVIGATION KEYBOARD BUILDER
export const createNineCardMenuKeyboard = (): InlineKeyboard => {
  return new InlineKeyboard()
    .text("📚 हुनर व शिक्षा (Courses)", "NAV_TRACK_01")
    .text("🌿 स्वास्थ्य पिलर (Wellness)", "NAV_TRACK_02")
    .row()
    .text("🏪 लोकल कॉमर्स (Shop)", "NAV_COMMERCE")
    .text("📈 ट्रेडिंग व सिग्नल्स (Signals)", "NAV_TRACK_04")
    .row()
    .text("💼 सेवा व गिग (Services)", "NAV_TRACK_05")
    .text("📊 पार्टनर डैशबोर्ड (Ledger)", "NAV_PARTNER")
    .row()
    .text("🛡️ विधिक व प्राइवेसी (Legal)", "NAV_LEGAL")
    .text("🔥 स्ट्रीक व रिवॉर्ड्स (Streak)", "NAV_STREAK")
    .row()
    .text("⚙️ सिस्टम हेल्थ (Status)", "NAV_HEALTH");
};

// 2. /menu COMMAND HANDLER
export const handleMenuCommand = async (ctx: BotContext): Promise<void> => {
  const traceId = CanonicalIdGenerator.generateTraceId();
  try {
    ctx.session.step = "MAIN_MENU";
    ctx.session.currentDomain = "D03_BOT_UI";

    const menuText =
      "🧭 *Rise Mitra — मुख्य नेविगेशन कंसोल (9-कार्ड ग्रिड)*\n\n" +
      "Rise Mitra सुपर-ऐप के 9 संप्रभु ट्रैक्स में से किसी एक का चयन करें:\n" +
      "• *शिक्षा व हुनर*: कौशल विकास और व्यावहारिक ज्ञान\n" +
      "• *स्वास्थ्य व कल्याण*: सुरक्षित मन व स्वस्थ जीवनशैली\n" +
      "• *वाणिज्य व सेवाएँ*: ₹0 कमीशन लोकल व्यापार व गिग\n" +
      "• *पारदर्शिता व कानून*: DPDP 2025, ₹0 जॉइनिंग फीस और 28% NCR सीलिंग\n\n" +
      "कृपया नीचे दिए गए बटन पर टैप करें:";

    await ctx.reply(menuText, {
      parse_mode: "Markdown",
      reply_markup: createNineCardMenuKeyboard(),
    });
  } catch (error) {
    const errorDetails = error instanceof Error ? error.message : "Unknown navigation error";
    const failureResult = CanonicalErrorFactory.create(
      "D03_BOT_UI",
      "MENU_DISPATCH_FAILED",
      `Failed to render main navigation menu: ${errorDetails}`,
      traceId
    );
    await ctx.reply(`⚠️ [Domain-03 Fail-Closed] मेनू लोड करने में असमर्थ। Trace ID: \`${failureResult.trace_id}\``, {
      parse_mode: "Markdown",
    });
  }
};

// 3. 9-CARD CALLBACK QUERY DISPATCHER
export const handleMenuCallback = async (ctx: BotContext): Promise<void> => {
  const traceId = CanonicalIdGenerator.generateTraceId();
  const action = ctx.callbackQuery?.data;

  if (!action) {
    await ctx.answerCallbackQuery({ text: "अमान्य इनपुट।" });
    return;
  }

  try {
    await ctx.answerCallbackQuery();

    const dispatchLog = {
      traceId,
      userId: ctx.session.userId,
      action,
      timestamp: new Date().toISOString(),
    };
    RFC8785Serializer.computeDigest(dispatchLog);

    switch (action) {
      case "NAV_TRACK_01":
        await ctx.reply("📚 *हुनर व शिक्षा (Track-01)*\n\nव्यावसायिक कौशल और डिजिटल प्रशिक्षण मॉड्यूल लोड हो रहे हैं...", {
          parse_mode: "Markdown",
        });
        break;

      case "NAV_TRACK_02":
        await ctx.reply("🌿 *स्वास्थ्य पिलर (Track-02)*\n\nदैनिक स्वास्थ्य ट्रैकिंग और वेलनेस मॉड्यूल सक्रिय है।", {
          parse_mode: "Markdown",
        });
        break;

      case "NAV_COMMERCE":
        await ctx.reply("🏪 *लोकल कॉमर्स (Track-03)*\n\n0% मर्चेंट कमीशन बाज़ार। स्थानीय उत्पाद और सेवाएं यहाँ सूचीबद्ध होंगी।", {
          parse_mode: "Markdown",
        });
        break;

      case "NAV_TRACK_04":
        await ctx.reply("📈 *ट्रेडिंग व सिग्नल्स (Track-04)*\n\nएल्गोरिदमिक सिग्नल्स और जोखिम प्रबंधन ढाँचा। SEBI डिस्क्लेमर लागू।", {
          parse_mode: "Markdown",
        });
        break;

      case "NAV_TRACK_05":
        await ctx.reply("💼 *सेवा व गिग इकॉनमी (Track-05)*\n\nफ्रीलांस कार्य, कौशल सेवाएं और लोकल गिग्स का प्रत्यक्ष आदान-प्रदान।", {
          parse_mode: "Markdown",
        });
        break;

      case "NAV_PARTNER":
        await ctx.reply("📊 *पार्टनर डैशबोर्ड (Track-06)*\n\nपारदर्शी सॉवरेन लेजर, 28.00% NCR हार्ड-कैप और 30-दिवसीय एस्क्रो स्थिति।", {
          parse_mode: "Markdown",
        });
        break;

      case "NAV_LEGAL":
        await ctx.reply("🛡️ *विधिक व प्राइवेसी (Track-07)*\n\nDPDP अधिनियम 2025, प्रत्यक्ष बिक्री नियम 2021 और ₹0 पूँजी जोखिम नीति।", {
          parse_mode: "Markdown",
        });
        break;

      case "NAV_STREAK":
        await ctx.reply("🔥 *स्ट्रीक व लॉयल्टी (Track-08)*\n\nदैनिक उपस्थिति, हुनर अभ्यास स्ट्रीक और गैर-वित्तीय प्रशंसा बैज।", {
          parse_mode: "Markdown",
        });
        break;

      case "NAV_HEALTH":
        await ctx.reply("⚙️ *सिस्टम हेल्थ व स्थिति (Track-09)*\n\nकर्नेल स्थिति: `UP` | मोड: `MODE-01` | कैनोनिकल बेसलाइन: `v0.20.0-FROZEN`", {
          parse_mode: "Markdown",
        });
        break;

      default:
        await ctx.reply(`ℹ️ मॉड्यूल \`${action}\` वर्तमान सैंडबॉक्स में प्रोसेस हो रहा है।`, {
          parse_mode: "Markdown",
        });
        break;
    }
  } catch (error) {
    const errorDetails = error instanceof Error ? error.message : "Callback dispatch error";
    const failureResult = CanonicalErrorFactory.create(
      "D03_BOT_UI",
      "CALLBACK_DISPATCH_FAILED",
      `Navigation action failed: ${errorDetails}`,
      traceId
    );
    await ctx.reply(`⚠️ [Fail-Closed] नेविगेशन में त्रुटि हुई। Trace ID: \`${failureResult.trace_id}\``, {
      parse_mode: "Markdown",
    });
  }
};
