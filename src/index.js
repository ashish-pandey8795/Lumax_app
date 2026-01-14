




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
//     storeInstallation: async (installation) => {
//       const teamId = installation.team.id;
//       const teamName = installation.team.name;

//       await pool.query(
//         `
//         INSERT INTO slack_installations (team_id, team_name, bot_token)
//         VALUES ($1, $2, $3)
//         ON CONFLICT (team_id)
//         DO UPDATE SET
//           team_name = EXCLUDED.team_name,
//           bot_token = EXCLUDED.bot_token
//         `,
//         [teamId, teamName, installation.bot.token]
//       );

//       console.log(`✅ Slack installed for workspace: ${teamName}`);
//     },

//     fetchInstallation: async ({ teamId }) => {
//       const res = await pool.query(
//         `SELECT * FROM slack_installations WHERE team_id = $1`,
//         [teamId]
//       );

//       if (!res.rows.length) {
//         throw new Error("No installation found");
//       }

//       const row = res.rows[0];

//       return {
//         team: { id: row.team_id, name: row.team_name },
//         bot: { token: row.bot_token },
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
//           />
//         </a>
//       </body>
//     </html>
//   `);
// });

// // ==================================
// // 🏠 SLACK APP HOME UI
// // ==================================
// app.event("app_home_opened", async ({ event, client }) => {
//   try {
//     await client.views.publish({
//       user_id: event.user,
//       view: {
//         type: "home",
//         blocks: [
//           {
//             type: "header",
//             text: {
//               type: "plain_text",
//               text: "👋 Welcome to Lumax CRM",
//             },
//           },
//           {
//             type: "section",
//             text: {
//               type: "mrkdwn",
//               text:
//                 "*Your Slack app is successfully installed!* 🎉\n\n" +
//                 "You can manage CRM actions directly from Slack.",
//             },
//           },
//           {
//             type: "divider",
//           },
//           {
//             type: "section",
//             text: {
//               type: "mrkdwn",
//               text: "*Available Actions*",
//             },
//           },
//           {
//             type: "actions",
//             elements: [
//               {
//                 type: "button",
//                 text: {
//                   type: "plain_text",
//                   text: "📋 View Records",
//                 },
//                 action_id: "view_records",
//               },
//               {
//                 type: "button",
//                 text: {
//                   type: "plain_text",
//                   text: "➕ Create Record",
//                 },
//                 action_id: "create_record",
//                 style: "primary",
//               },
//             ],
//           },
//           {
//             type: "context",
//             elements: [
//               {
//                 type: "mrkdwn",
//                 text: "⚡ Powered by Lumax Slack Integration",
//               },
//             ],
//           },
//         ],
//       },
//     });
//   } catch (error) {
//     console.error("❌ Error publishing App Home:", error);
//   }
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
import express from "express";
import pkg from "@slack/bolt";
import cors from "cors";
import bodyParser from "body-parser";
import pg from "pg";

const { App, ExpressReceiver } = pkg;
const { Pool } = pg;

/* ----------------------------------
   🗄️ DATABASE
---------------------------------- */
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

/* ----------------------------------
   🔌 EXPRESS RECEIVER (OAuth)
---------------------------------- */
const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  stateSecret: process.env.SESSION_SECRET || "slack-secret",

  scopes: ["commands", "chat:write", "users:read"],

  installerOptions: {
    redirectUriPath: "/slack/oauth_redirect",
    stateVerification: false,
  },

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

      console.log(`✅ Slack installed for: ${teamName}`);
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

/* ----------------------------------
   🌐 EXPRESS APP
---------------------------------- */
const expressApp = receiver.app;

// REQUIRED: express import visible
expressApp.use(express.json());
expressApp.use(cors());
expressApp.use(bodyParser.json());

/* ----------------------------------
   🏠 HEALTH CHECK
---------------------------------- */
expressApp.get("/", (_, res) => {
  res.send("✅ Slack OAuth App Running");
});

/* ----------------------------------
   🔑 SLACK INSTALL PAGE
---------------------------------- */
expressApp.get("/slack/install", (_, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head><title>Install Slack App</title></head>
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

/* ----------------------------------
   🤖 SLACK APP
---------------------------------- */
const app = new App({
  receiver,
  processBeforeResponse: true,
});

/* ----------------------------------
   🏠 APP HOME
---------------------------------- */
app.event("app_home_opened", async ({ event, client }) => {
  try {
    await client.views.publish({
      user_id: event.user,
      view: {
        type: "home",
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: "👋 Welcome to Lumax CRM" },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text:
                "*Slack app successfully installed!* 🎉\n\n" +
                "Manage CRM actions directly from Slack.",
            },
          },
          { type: "divider" },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: { type: "plain_text", text: "📋 View Records" },
                action_id: "view_records",
              },
              {
                type: "button",
                text: { type: "plain_text", text: "➕ Create Record" },
                action_id: "create_record",
                style: "primary",
              },
            ],
          },
        ],
      },
    });
  } catch (err) {
    console.error("❌ App Home error:", err);
  }
});

/* ----------------------------------
   🚀 START SERVER
---------------------------------- */
(async () => {
  try {
    await initDb();
    const PORT = process.env.PORT || 3000;
    await app.start(PORT);
    console.log(`⚡ Slack App running on http://localhost:${PORT}`);
  } catch (err) {
    console.error("❌ Server start failed:", err);
    process.exit(1);
  }
})();
