import dotenv from "dotenv";
dotenv.config();

import { initDb, pool } from "./db/init.js";
import pkg from "@slack/bolt";
const { App } = pkg;

(async () => {
  // 1️⃣ DB connect
  let dbConnected = false;
  try {
    await initDb();
    dbConnected = true;
  } catch (err) {
    console.error("⚠️ DB connection failed, Slack app will still start.");
  }

  // 2️⃣ Check Slack env vars
  const requiredEnv = ["SLACK_SIGNING_SECRET", "SLACK_BOT_TOKEN"];
  for (const key of requiredEnv) {
    if (!process.env[key]) {
      console.error(`❌ Missing environment variable: ${key}`);
      process.exit(1);
    }
  }

  // 3️⃣ Initialize Slack App for single workspace
  try {
    const app = new App({
      token: process.env.SLACK_BOT_TOKEN,
      signingSecret: process.env.SLACK_SIGNING_SECRET,
    });

    // Home tab demo
    app.event("app_home_opened", async ({ event, client }) => {
      try {
        await client.views.publish({
          user_id: event.user,
          view: {
            type: "home",
            callback_id: "home_demo",
            blocks: [
              { type: "section", text: { type: "mrkdwn", text: "*✅ Slack App Connectivity Demo*" } },
              { type: "section", text: { type: "mrkdwn", text: `DB status: ${dbConnected ? "✅ Connected" : "❌ Failed"}` } }
            ],
          },
        });
      } catch (err) {
        console.error("Error publishing home tab:", err);
      }
    });

    // Slash command
    app.command("/hello", async ({ ack, body, client }) => {
      await ack();
      await client.chat.postMessage({
        channel: body.user_id,
        text: `👋 Hello <@${body.user_id}>! Slack connected. DB: ${dbConnected ? "✅ Connected" : "❌ Failed"}`,
      });
    });

    // Start Slack app
    const PORT = process.env.PORT || 3000;
    await app.start(PORT);
    console.log(`⚡ Slack App running on port ${PORT}`);
    console.log(`ℹ️ Database status: ${dbConnected ? "✅ Connected" : "❌ Failed"}`);
  } catch (err) {
    console.error("❌ Slack App initialization failed:", err);
    process.exit(1);
  }
})();
