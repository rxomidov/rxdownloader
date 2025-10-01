require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const { instagramGetUrl } = require("instagram-url-direct");
// const express = require("express");
const ytdl = require("ytdl-core");
const fbDownloader = require("fb-downloader-scrapper");
const axios = require("axios");

// 🔑 Put your token from BotFather here OR set in env
const token = process.env.TOKEN;

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "👋 Salom, Instagramdan video (reels) link yuboring, videosini yuklab beraman."
  );
});

// --- Fake web server so Render marks it "Live"
// const app = express();
// app.get("/", (req, res) => res.send("Bot is running..."));
// app.listen(process.env.PORT || 3000, () => {
//   console.log("Web server running on port", process.env.PORT || 3000);
// });

// Listen for any message
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const url = msg.text;

  // skip if it's command
  if (!url || url.startsWith("/")) return;

  try {
    if (url.includes("instagram.com")) {
      await handleInstagram(chatId, url);
    } else if (url.includes("youtube.com/shorts") || url.includes("youtu.be")) {
      await handleYouTube(chatId, url);
    } else if (url.includes("facebook.com") || url.includes("fb.watch")) {
      await handleFacebook(chatId, url);
    } else {
      await bot.sendMessage(chatId, "⚠️ Unsupported link. Send Instagram, YouTube Shorts, or Facebook video.");
    }
  } catch (err) {
    console.error("Error:", err.message);
    bot.sendMessage(
      chatId,
      "❌ Videoni yuklashda xatolik yuz berdi. Linkni tog'ri va ochiq(public) ekanini tekshiring."
    );
  }
});

//
// Instagram
//
async function handleInstagram(chatId, url) {
  bot.sendMessage(chatId, "⏳ Instagram havolangiz qayta ishlanmoqda...");

  const result = await instagramGetUrl(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      Referer: "https://www.instagram.com/",
    },
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
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          Referer: "https://www.instagram.com/",
        },
        responseType: "arraybuffer",
      });
      const buffer = Buffer.from(response.data, "binary");

      await bot.sendVideo(chatId, buffer, {
        caption: `Link: ${url}\n🎥 From Instagram by @rxdownloaderbot`,
      });
    } catch (err) {
      console.error("ErrorAxios:", err.message);
    }
  }
}

//
// YouTube Shorts
//
async function handleYouTube(chatId, url) {
  try {
    await bot.sendMessage(chatId, "📥 Downloading YouTube Shorts...");

    if (!ytdl.validateURL(url)) {
      return bot.sendMessage(chatId, "⚠️ Invalid YouTube link.");
    }

    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title;

    // Stream video directly into memory
    const chunks = [];
    await new Promise((resolve, reject) => {
      ytdl(url, { quality: "18", filter: "audioandvideo" })
        .on("data", (chunk) => chunks.push(chunk))
        .on("end", resolve)
        .on("error", reject);
    });

    const buffer = Buffer.concat(chunks);

    await bot.sendVideo(chatId, buffer, {
      caption: `▶️ YouTube Shorts\n${title}\n${url}`,
    });
  } catch (err) {
    console.error("YouTube download error:", err);
    await bot.sendMessage(chatId, "❌ Failed to download YouTube video. Maybe too long or unsupported.");
  }
}

//
// Facebook
//
async function handleFacebook(chatId, url) {
  bot.sendMessage(chatId, "📥 Downloading Facebook video...");
  const result = await fbDownloader(url);
  if (!result || !result.sd || !result.sd[0] || !result.sd[0].url) {
    return bot.sendMessage(chatId, "⚠️ Could not fetch video.");
  }

  // use SD version (smaller), HD also available at result.hd
  const videoUrl = result.sd[0].url;
  const res = await axios.get(videoUrl, { responseType: "arraybuffer", timeout: 60000 });
  const buffer = Buffer.from(res.data);

  await bot.sendVideo(chatId, buffer, {
    caption: `📘 Facebook Video\n${url}`,
  });
}
