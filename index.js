const TelegramBot = require("node-telegram-bot-api");
const youtubedl = require("youtube-dl-exec");
const fs = require("fs");

const token = process.env.TOKEN;
const bot = new TelegramBot(token, { polling: true });

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text) return;

  if (
    text.includes("youtube.com") ||
    text.includes("youtu.be") ||
    text.includes("facebook.com") ||
    text.includes("fb.watch") ||
    text.includes("instagram.com")
  ) {
    await handleDownload(chatId, text);
  } else {
    bot.sendMessage(chatId, "⚠️ Send me a YouTube, Facebook, or Instagram video link.");
  }
});

async function handleDownload(chatId, url) {
  try {
    await bot.sendMessage(chatId, "📥 Downloading video...");

    const filename = `video_${Date.now()}.mp4`;

    // Download with yt-dlp
    await youtubedl(url, {
      output: filename,
      format: "mp4[height<=480]" // keep file small for Telegram
    });

    const buffer = fs.readFileSync(filename);

    // Send video
    await bot.sendVideo(chatId, buffer, { caption: `▶️ ${url}` });

    fs.unlinkSync(filename); // cleanup
  } catch (err) {
    console.error("Download error:", err);
    bot.sendMessage(chatId, "❌ Failed to download this video.");
  }
}
