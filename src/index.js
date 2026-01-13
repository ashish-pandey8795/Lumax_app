require("dotenv").config();
const { App } = require("@slack/bolt");

// ⚡ Minimal Slack app in Socket Mode
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,      // Bot token
  appToken: process.env.SLACK_APP_TOKEN,   // App-level token (starts with xapp-)
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,                         // <-- important
});

// Simple home tab event demo
app.event("app_home_opened", async ({ event, client }) => {
  try {
    await client.views.publish({
      user_id: event.user,
      view: {
        type: "home",
        callback_id: "home_demo",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*✅ Slack App Connectivity Demo*",
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "Your app is connected and listening via Socket Mode!",
            },
          },
        ],
      },
    });
  } catch (err) {
    console.error(err);
  }
});

// Simple slash command demo
app.command("/hello", async ({ ack, body, client }) => {
  await ack();
  await client.chat.postMessage({
    channel: body.user_id,
    text: `👋 Hello <@${body.user_id}>! Your Slack app is connected via Socket Mode.`,
  });
});

// Start the app
(async () => {
  await app.start();
  console.log("⚡ Slack app running in Socket Mode!");
})();
