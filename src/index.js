require("dotenv").config();
const { App, ExpressReceiver } = require("@slack/bolt");

// Initialize ExpressReceiver
const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  stateSecret: process.env.SESSION_SECRET || "secret",
  installerOptions: {
    redirectUriPath: "/slack/oauth_redirect",
    stateVerification: false,
  },
  scopes: ["commands", "chat:write", "users:read"],
});

// Initialize Slack App
const app = new App({ receiver });

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
              text: "Your app is connected and listening!",
            },
          },
        ],
      },
    });
  } catch (err) {
    console.error("Error publishing home tab:", err);
  }
});

// Simple slash command demo
app.command("/hello", async ({ ack, body, client }) => {
  await ack();
  await client.chat.postMessage({
    channel: body.user_id,
    text: `👋 Hello <@${body.user_id}>! Your Slack app is connected.`,
  });
});

// Express endpoint to confirm server is running
receiver.router.get("/", (_, res) => res.send("✅ Slack App demo running"));

// Start the app
(async () => {
  const PORT = process.env.PORT || 3000;
  await app.start(PORT);
  console.log(`⚡ Slack App demo running on port ${PORT}`);
})();
