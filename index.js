const TelegramBot = require("node-telegram-bot-api");
const {instagramGetUrl} = require("instagram-url-direct");
const axios = require("axios");

// 🔑 Put your token from BotFather here OR set in env
const token =
  process.env.TELEGRAM_TOKEN ||
  "7668721421:AAGS4Hi0uGV2m14FJNXxm5Zc57o1TUgjwgs";

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "👋 Send me an Instagram post or reel link (public), and I'll download the video for you."
  );
});

// Listen for any message
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // skip if it's command
  if (!text || text.startsWith("/")) return;

  bot.sendMessage(chatId, "⏳ Processing your link...");

  try {
    const result = await instagramGetUrl(text);
    if (!result.url_list || result.url_list.length === 0) {
      return bot.sendMessage(chatId, "⚠️ No video found at that link.");
    }

    // Loop through all videos (carousel posts can have multiple)
    for (let i = 0; i < result.url_list.length; i++) {
      const videoUrl = result.url_list[i];
      console.error("videoUrl:", videoUrl);
      // Download video into buffer (optional, you can also send the link directly)
      const response = await axios.get(videoUrl, {
        responseType: "arraybuffer",
      });
      const buffer = Buffer.from(response.data, "binary");

      await bot.sendVideo(chatId, buffer, {
        caption: `Link: ${text}\n🎥 From Instagram by @rxdownloaderbot`,
      });
    }
  } catch (err) {
    console.error("Error:", err.message);
    bot.sendMessage(
      chatId,
      "❌ Failed to fetch video. Make sure the link is valid & public."
    );
  }
});
