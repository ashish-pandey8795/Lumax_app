// import dotenv from "dotenv";
// dotenv.config();

// import express from "express"; // ✅ fix for bundlers/tools
// import { initDb, pool } from "./db/init.js";
// import pkg from "@slack/bolt";
// const { App } = pkg;

// (async () => {
//   // 1️⃣ DB connect
//   let dbConnected = false;
//   try {
//     await initDb();
//     dbConnected = true;
//   } catch (err) {
//     console.error("⚠️ DB connection failed, Slack app will still start.");
//   }

//   // 2️⃣ Check Slack env vars
//   const requiredEnv = ["SLACK_SIGNING_SECRET", "SLACK_BOT_TOKEN"];
//   for (const key of requiredEnv) {
//     if (!process.env[key]) {
//       console.error(`❌ Missing environment variable: ${key}`);
//       process.exit(1);
//     }
//   }

//   // 3️⃣ Initialize Slack App for single workspace
//   try {
//     const app = new App({
//       token: process.env.SLACK_BOT_TOKEN,
//       signingSecret: process.env.SLACK_SIGNING_SECRET,
//     });

//     // Home tab demo
//     app.event("app_home_opened", async ({ event, client }) => {
//       try {
//         await client.views.publish({
//           user_id: event.user,
//           view: {
//             type: "home",
//             callback_id: "home_demo",
//             blocks: [
//               { type: "section", text: { type: "mrkdwn", text: "*✅ Slack App Connectivity Demo*" } },
//               { type: "section", text: { type: "mrkdwn", text: `DB status: ${dbConnected ? "✅ Connected" : "❌ Failed"}` } }
//             ],
//           },
//         });
//       } catch (err) {
//         console.error("Error publishing home tab:", err);
//       }
//     });

//     // Slash command
//     app.command("/hello", async ({ ack, body, client }) => {
//       await ack();
//       await client.chat.postMessage({
//         channel: body.user_id,
//         text: `👋 Hello <@${body.user_id}>! Slack connected. DB: ${dbConnected ? "✅ Connected" : "❌ Failed"}`,
//       });
//     });

//     // Start Slack app
//     const PORT = process.env.PORT || 3000;
//     await app.start(PORT);
//     console.log(`⚡ Slack App running on port ${PORT}`);
//     console.log(`ℹ️ Database status: ${dbConnected ? "✅ Connected" : "❌ Failed"}`);
//   } catch (err) {
//     console.error("❌ Slack App initialization failed:", err);
//     process.exit(1);
//   }
// })();




















// import "dotenv/config";
// import pkg from "@slack/bolt";
// import cors from "cors";
// import bodyParser from "body-parser";
// import pg from "pg";

// const { App, ExpressReceiver } = pkg;
// const { Pool } = pg;

// // ----------------------------------
// // 🗄️ DATABASE
// // ----------------------------------
// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
// });

// async function initDb() {
//   await pool.query(`
//     CREATE TABLE IF NOT EXISTS slack_installations (
//       id SERIAL PRIMARY KEY,
//       team_id TEXT UNIQUE NOT NULL,
//       team_name TEXT,
//       bot_token TEXT NOT NULL,
//       bot_user_id TEXT,
//       installed_by TEXT,
//       created_at TIMESTAMP DEFAULT NOW()
//     )
//   `);
// }

// // ----------------------------------
// // 🔌 SLACK EXPRESS RECEIVER (OAuth)
// // ----------------------------------
// const receiver = new ExpressReceiver({
//   signingSecret: process.env.SLACK_SIGNING_SECRET,
//   clientId: process.env.SLACK_CLIENT_ID,
//   clientSecret: process.env.SLACK_CLIENT_SECRET,
//   stateSecret: process.env.SESSION_SECRET || "slack-secret",
//   installerOptions: {
//     redirectUriPath: "/slack/oauth_redirect",
//     stateVerification: false,
//   },
//   scopes: ["commands", "chat:write", "users:read"],
//   installationStore: {
//     // Save installation
//     storeInstallation: async (installation) => {
//       const teamId = installation.team.id;
//       const teamName = installation.team.name;
//       const botToken = installation.bot.token;
//       const botUserId = installation.bot.userId;
//       const installedBy = installation.user.id;

//       await pool.query(
//         `
//         INSERT INTO slack_installations
//         (team_id, team_name, bot_token, bot_user_id, installed_by)
//         VALUES ($1, $2, $3, $4, $5)
//         ON CONFLICT (team_id)
//         DO UPDATE SET
//           team_name = EXCLUDED.team_name,
//           bot_token = EXCLUDED.bot_token,
//           bot_user_id = EXCLUDED.bot_user_id,
//           installed_by = EXCLUDED.installed_by
//         `,
//         [teamId, teamName, botToken, botUserId, installedBy]
//       );

//       console.log(`✅ Slack installed for workspace: ${teamName}`);
//     },

//     // Fetch installation
//     fetchInstallation: async ({ teamId }) => {
//       const res = await pool.query(
//         `SELECT * FROM slack_installations WHERE team_id = $1`,
//         [teamId]
//       );

//       if (!res.rows.length) {
//         throw new Error("No Slack installation found");
//       }

//       const row = res.rows[0];

//       return {
//         team: { id: row.team_id, name: row.team_name },
//         bot: {
//           token: row.bot_token,
//           userId: row.bot_user_id,
//         },
//       };
//     },
//   },
// });

// // ----------------------------------
// // 🤖 SLACK APP
// // ----------------------------------
// const app = new App({
//   receiver,
//   processBeforeResponse: true,
// });

// // ----------------------------------
// // 🌐 MIDDLEWARE
// // ----------------------------------
// receiver.router.use(cors());
// receiver.router.use(bodyParser.json());

// // ----------------------------------
// // 🏠 ROOT HEALTH CHECK
// // ----------------------------------
// receiver.router.get("/", (_, res) => {
//   res.send("✅ Slack OAuth App Running");
// });

// // ----------------------------------
// // 🔑 SLACK INSTALL PAGE
// // ----------------------------------
// receiver.router.get("/slack/install", (_, res) => {
//   res.send(`
//     <!DOCTYPE html>
//     <html>
//       <head>
//         <title>Install Slack App</title>
//       </head>
//       <body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif">
//         <a href="/slack/oauth_redirect">
//           <img
//             alt="Add to Slack"
//             height="40"
//             width="139"
//             src="https://platform.slack-edge.com/img/add_to_slack.png"
//             srcset="
//               https://platform.slack-edge.com/img/add_to_slack.png 1x,
//               https://platform.slack-edge.com/img/add_to_slack@2x.png 2x
//             "
//           />
//         </a>
//       </body>
//     </html>
//   `);
// });

// // ----------------------------------
// // 🚀 START SERVER
// // ----------------------------------
// (async () => {
//   try {
//     await initDb();
//     const PORT = process.env.PORT || 3000;
//     await app.start(PORT);
//     console.log(`⚡ Slack App running on http://localhost:${PORT}`);
//   } catch (err) {
//     console.error("❌ Failed to start server:", err);
//     process.exit(1);
//   }
// })();







import "dotenv/config";
import pkg from "@slack/bolt";
import cors from "cors";
import bodyParser from "body-parser";
import pg from "pg";

const { App, ExpressReceiver } = pkg;
const { Pool } = pg;

// ----------------------------------
// 🗄️ DATABASE
// ----------------------------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS slack_installations (
      id SERIAL PRIMARY KEY,
      team_id TEXT UNIQUE NOT NULL,
      team_name TEXT,
      bot_token TEXT NOT NULL,
      bot_user_id TEXT,
      installed_by TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

// ----------------------------------
// 🔌 SLACK EXPRESS RECEIVER (OAuth)
// ----------------------------------
const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  stateSecret: process.env.SESSION_SECRET || "slack-secret",
  installerOptions: {
    redirectUriPath: "/slack/oauth_redirect",
    stateVerification: false,
  },
  scopes: ["commands", "chat:write", "users:read"],
  installationStore: {
    storeInstallation: async (installation) => {
      const teamId = installation.team.id;
      const teamName = installation.team.name;

      await pool.query(
        `
        INSERT INTO slack_installations (team_id, team_name, bot_token)
        VALUES ($1, $2, $3)
        ON CONFLICT (team_id)
        DO UPDATE SET
          team_name = EXCLUDED.team_name,
          bot_token = EXCLUDED.bot_token
        `,
        [teamId, teamName, installation.bot.token]
      );

      console.log(`✅ Slack installed for workspace: ${teamName}`);
    },

    fetchInstallation: async ({ teamId }) => {
      const res = await pool.query(
        `SELECT * FROM slack_installations WHERE team_id = $1`,
        [teamId]
      );

      if (!res.rows.length) {
        throw new Error("No installation found");
      }

      const row = res.rows[0];

      return {
        team: { id: row.team_id, name: row.team_name },
        bot: { token: row.bot_token },
      };
    },
  },
});

// ----------------------------------
// 🤖 SLACK APP
// ----------------------------------
const app = new App({
  receiver,
  processBeforeResponse: true,
});

// ----------------------------------
// 🌐 MIDDLEWARE
// ----------------------------------
receiver.router.use(cors());
receiver.router.use(bodyParser.json());

// ----------------------------------
// 🏠 ROOT HEALTH CHECK
// ----------------------------------
receiver.router.get("/", (_, res) => {
  res.send("✅ Slack OAuth App Running");
});

// ----------------------------------
// 🔑 SLACK INSTALL PAGE
// ----------------------------------
receiver.router.get("/slack/install", (_, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Install Slack App</title>
      </head>
      <body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif">
        <a href="/slack/oauth_redirect">
          <img
            alt="Add to Slack"
            height="40"
            width="139"
            src="https://platform.slack-edge.com/img/add_to_slack.png"
          />
        </a>
      </body>
    </html>
  `);
});

// ==================================
// 🏠 SLACK APP HOME UI
// ==================================
app.event("app_home_opened", async ({ event, client }) => {
  try {
    await client.views.publish({
      user_id: event.user,
      view: {
        type: "home",
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "👋 Welcome to Lumax CRM",
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text:
                "*Your Slack app is successfully installed!* 🎉\n\n" +
                "You can manage CRM actions directly from Slack.",
            },
          },
          {
            type: "divider",
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*Available Actions*",
            },
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "📋 View Records",
                },
                action_id: "view_records",
              },
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "➕ Create Record",
                },
                action_id: "create_record",
                style: "primary",
              },
            ],
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: "⚡ Powered by Lumax Slack Integration",
              },
            ],
          },
        ],
      },
    });
  } catch (error) {
    console.error("❌ Error publishing App Home:", error);
  }
});

// ----------------------------------
// 🚀 START SERVER
// ----------------------------------
(async () => {
  try {
    await initDb();
    const PORT = process.env.PORT || 3000;
    await app.start(PORT);
    console.log(`⚡ Slack App running on http://localhost:${PORT}`);
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
})();
