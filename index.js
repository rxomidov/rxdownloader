require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const {instagramGetUrl} = require("instagram-url-direct");
const express = require("express");
const axios = require("axios");

// 🔑 Put your token from BotFather here OR set in env
const token = process.env.TOKEN

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "👋 Send me an Instagram post or reel link (public), and I'll download the video for you."
  );
});

// --- Fake web server so Render marks it "Live"
const app = express();
app.get("/", (req, res) => res.send("Bot is running..."));
app.listen(process.env.PORT || 3000, () => {
  console.log("Web server running on port", process.env.PORT || 3000);
});

// Listen for any message
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // skip if it's command
  if (!text || text.startsWith("/")) return;

  bot.sendMessage(chatId, "⏳ Processing your link...");

  try {
    const result = await instagramGetUrl(text, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
          "AppleWebKit/537.36 (KHTML, like Gecko) " +
          "Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Referer": "https://www.instagram.com/"
      }
    });
    if (!result.url_list || result.url_list.length === 0) {
      return bot.sendMessage(chatId, "⚠️ No video found at that link.");
    }

    // Loop through all videos (carousel posts can have multiple)
    for (let i = 0; i < result.url_list.length; i++) {
      const videoUrl = result.url_list[i];
      // Download video into buffer (optional, you can also send the link directly)
      try {
        const response = await axios.get(videoUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Referer": "https://www.instagram.com/",
          },
          responseType: "arraybuffer",
        });
        const buffer = Buffer.from(response.data, "binary");

        await bot.sendVideo(chatId, buffer, {
          caption: `Link: ${text}\n🎥 From Instagram by @rxdownloaderbot`,
        });
      } catch (err) {
        console.error("ErrorAxios:", err.message);
      }   
    }
  } catch (err) {
    console.error("Error:", err.message);
    bot.sendMessage(
      chatId,
      "❌ Failed to fetch video. Make sure the link is valid & public."
    );
  }
});
