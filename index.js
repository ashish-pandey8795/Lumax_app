// require("dotenv").config();
// import express from "express";
// const { App, ExpressReceiver } = require("@slack/bolt");

// /* -------------------------------------------------------
//    :brain: IN-MEMORY INSTALLATION STORE (DEMO ONLY)
// ------------------------------------------------------- */
// const installationStore = {
//   storeInstallation: async (installation) => {
//     global.__INSTALLS__ = global.__INSTALLS__ || {};

//     const key = installation.isEnterpriseInstall
//       ? `enterprise:${installation.enterprise.id}`
//       : `team:${installation.team.id}`;

//     global.__INSTALLS__[key] = installation;
//   },

//   fetchInstallation: async ({ teamId, enterpriseId, isEnterpriseInstall }) => {
//     const key = isEnterpriseInstall
//       ? `enterprise:${enterpriseId}`
//       : `team:${teamId}`;

//     const installation = global.__INSTALLS__?.[key];
//     if (!installation) throw new Error("No installation found");

//     return installation;
//   },
// };

// /* -------------------------------------------------------
//    :electric_plug: EXPRESS RECEIVER (OAUTH ENABLED)
// ------------------------------------------------------- */
// const receiver = new ExpressReceiver({
//   signingSecret: process.env.SLACK_SIGNING_SECRET,

//   clientId: process.env.SLACK_CLIENT_ID,
//   clientSecret: process.env.SLACK_CLIENT_SECRET,
//   stateSecret: process.env.SLACK_STATE_SECRET || "secret",

//   scopes: ["chat:write"],

//   installerOptions: {
//     installPath: "/slack/install",
//     redirectUriPath: "/slack/oauth_redirect",
//     stateVerification: false, // OK for admin / Grid installs
//   },

//   installationStore,
// });

// /* -------------------------------------------------------
//    :zap: SLACK APP (NO authorize HERE)
// ------------------------------------------------------- */


// /* -------------------------------------------------------
//    :globe_with_meridians: ROOT ROUTE
// ------------------------------------------------------- */
// receiver.router.get("/", (_, res) => {
//   res.send(`
//     <h2>:white_check_mark: Slack OAuth Demo Running</h2>
//     <a href="/slack/install">Install App</a>
//   `);
// });

// /* -------------------------------------------------------
//    :house: APP HOME
// ------------------------------------------------------- */
// app.event("app_home_opened", async ({ event, client }) => {
//   await client.views.publish({
//     user_id: event.user,
//     view: {
//       type: "home",
//       blocks: [
//         {
//           type: "section",
//           text: {
//             type: "mrkdwn",
//             text: "*Demo App* :wave:\nClick below to open the form.",
//           },
//         },
//         {
//           type: "actions",
//           elements: [
//             {
//               type: "button",
//               action_id: "open_form",
//               text: { type: "plain_text", text: "Open Form" },
//               style: "primary",
//             },
//           ],
//         },
//       ],
//     },
//   });
// });

// /* -------------------------------------------------------
//    :bricks: OPEN MODAL
// ------------------------------------------------------- */
// app.action("open_form", async ({ ack, body, client }) => {
//   await ack();

//   await client.views.open({
//     trigger_id: body.trigger_id,
//     view: {
//       type: "modal",
//       callback_id: "submit_form",
//       title: { type: "plain_text", text: "Demo Form" },
//       submit: { type: "plain_text", text: "Submit" },
//       close: { type: "plain_text", text: "Cancel" },
//       blocks: [
//         {
//           type: "input",
//           block_id: "name_block",
//           label: { type: "plain_text", text: "Your Name" },
//           element: {
//             type: "plain_text_input",
//             action_id: "name_input",
//           },
//         },
//       ],
//     },
//   });
// });

// /* -------------------------------------------------------
//    :white_check_mark: SUBMIT → SUCCESS DM
// ------------------------------------------------------- */
// app.view("submit_form", async ({ ack, body, view, client }) => {
//   await ack();

//   const name = view.state.values.name_block.name_input.value;

//   await client.chat.postMessage({
//     channel: body.user.id,
//     text: `:white_check_mark: Submitted successfully!\nHello *${name}* :wave:`,
//   });
// });

// /* -------------------------------------------------------
//    :rocket: START SERVER
// ------------------------------------------------------- */
// (async () => {
//   const PORT = process.env.PORT || 3000;
//   await app.start(PORT);
//   console.log(`:zap: Demo Slack App running on http://localhost:${PORT}`);
// })();







// // index.js
// import "dotenv/config";
// import express from "express";
// import pkg from "@slack/bolt";
// import cors from "cors";
// import bodyParser from "body-parser";
// import pg from "pg";

// import billRoutes from "./routes/bill.routes.js"; // ✅ Bill routes import

// const { App, ExpressReceiver } = pkg;
// const { Pool } = pg;

// /* ----------------------------------
//    🗄️ DATABASE
// ---------------------------------- */
// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
// });

// export async function initDb() {
//   await pool.query(`
//     CREATE TABLE IF NOT EXISTS slack_installations (
//       id SERIAL PRIMARY KEY,
//       team_id TEXT UNIQUE NOT NULL,
//       team_name TEXT,
//       bot_token TEXT NOT NULL,
//       created_at TIMESTAMP DEFAULT NOW()
//     )
//   `);
// }

// /* ----------------------------------
//    🔌 EXPRESS RECEIVER
// ---------------------------------- */
// const receiver = new ExpressReceiver({
//   signingSecret: process.env.SLACK_SIGNING_SECRET,
//   clientId: process.env.SLACK_CLIENT_ID,
//   clientSecret: process.env.SLACK_CLIENT_SECRET,
//   stateSecret: process.env.SESSION_SECRET || "slack-secret",
//   scopes: ["commands", "chat:write"],
//   installerOptions: {
//     redirectUriPath: "/slack/oauth_redirect",
//     stateVerification: false,
//   },
//   installationStore: {
//     storeInstallation: async (installation) => {
//       await pool.query(
//         `
//         INSERT INTO slack_installations (team_id, team_name, bot_token)
//         VALUES ($1,$2,$3)
//         ON CONFLICT (team_id)
//         DO UPDATE SET bot_token = EXCLUDED.bot_token
//         `,
//         [
//           installation.team.id,
//           installation.team.name,
//           installation.bot.token,
//         ]
//       );
//     },

//     fetchInstallation: async ({ teamId }) => {
//       const res = await pool.query(
//         `SELECT * FROM slack_installations WHERE team_id=$1`,
//         [teamId]
//       );
//       if (!res.rows.length) throw new Error("No installation found for team");
//       return {
//         team: { id: res.rows[0].team_id },
//         bot: { token: res.rows[0].bot_token },
//       };
//     },
//   },
// });

// /* ----------------------------------
//    🌐 EXPRESS APP
// ---------------------------------- */
// const expressApp = receiver.app;
// expressApp.use(express.json());
// expressApp.use(cors());
// expressApp.use(bodyParser.json());

// // ✅ Bill API routes
// expressApp.use("/api/bill", billRoutes);

// // Basic health check
// expressApp.get("/", (_, res) => {
//   res.send("✅ Slack App Running");
// });

// /* ----------------------------------
//    🤖 SLACK APP
// ---------------------------------- */
// const app = new App({
//   receiver,
//   processBeforeResponse: true,
// });

// /* ----------------------------------
//    🌱 PLANT MASTER
// ---------------------------------- */
// const PLANTS = [
//   {
//     company: "LUMAX AUTO TECH LTD",
//     plantCode: "7020",
//     plantName: "LMPL PCNT PUNE-7020",
//     location: "Pune",
//   },
//   {
//     company: "LUMAX AUTO TECH LTD",
//     plantCode: "7030",
//     plantName: "LMPL CHAKAN-7030",
//     location: "Chakan",
//   },
// ];

// /* ----------------------------------
//    🧱 MODAL BUILDER
// ---------------------------------- */
// const buildInvoiceModal = (initialPlantName = "") => ({
//   type: "modal",
//   callback_id: "invoice_modal",
//   title: { type: "plain_text", text: "Create Invoice" },
//   submit: { type: "plain_text", text: "Submit" },
//   close: { type: "plain_text", text: "Cancel" },

//   blocks: [
//     {
//       type: "input",
//       block_id: "company",
//       label: { type: "plain_text", text: "Company" },
//       element: {
//         type: "static_select",
//         action_id: "company_select",
//         options: [
//           {
//             text: { type: "plain_text", text: "LUMAX AUTO TECH LTD" },
//             value: "LUMAX AUTO TECH LTD",
//           },
//         ],
//       },
//     },
//     {
//       type: "input",
//       block_id: "plant",
//       label: { type: "plain_text", text: "Plant Code" },
//       element: {
//         type: "static_select",
//         action_id: "plant_select",
//         options: PLANTS.map((p) => ({
//           text: { type: "plain_text", text: p.plantCode },
//           value: p.plantCode,
//         })),
//       },
//     },
//     {
//       type: "input",
//       block_id: "plant_name",
//       label: { type: "plain_text", text: "Plant Name" },
//       element: {
//         type: "plain_text_input",
//         action_id: "plant_name_input",
//         initial_value: initialPlantName,
//       },
//     },
//     {
//       type: "input",
//       block_id: "bill_month",
//       label: { type: "plain_text", text: "Bill Month" },
//       element: {
//         type: "datepicker",
//         action_id: "value",
//       },
//     },
//     {
//       type: "input",
//       block_id: "invoice_no",
//       label: { type: "plain_text", text: "Invoice No" },
//       element: {
//         type: "plain_text_input",
//         action_id: "value",
//       },
//     },
//     {
//       type: "input",
//       block_id: "amount",
//       label: { type: "plain_text", text: "Amount (INR)" },
//       element: {
//         type: "plain_text_input",
//         action_id: "value",
//       },
//     },
//   ],
// });

// /* ----------------------------------
//    ⚡ /invoice COMMAND
// ---------------------------------- */
// app.command("/invoice", async ({ ack, body, client }) => {
//   await ack();

//   await client.views.open({
//     trigger_id: body.trigger_id,
//     view: buildInvoiceModal(),
//   });
// });

// /* ----------------------------------
//    ⚡ AUTO-FILL PLANT NAME ON PLANT CODE SELECTION
// ---------------------------------- */
// app.action("plant_select", async ({ ack, body, client, action, view }) => {
//   await ack();

//   const selectedPlantCode = action.selected_option.value;
//   const plant = PLANTS.find((p) => p.plantCode === selectedPlantCode);
//   if (!plant) return;

//   const updatedView = buildInvoiceModal(plant.plantName);

//   await client.views.update({
//     view_id: view.id,
//     hash: view.hash,
//     view: {
//       ...updatedView,
//       blocks: updatedView.blocks.map((block) => {
//         if (block.block_id === "plant") {
//           return {
//             ...block,
//             element: {
//               ...block.element,
//               initial_option: {
//                 text: { type: "plain_text", text: plant.plantCode },
//                 value: plant.plantCode,
//               },
//             },
//           };
//         }
//         return block;
//       }),
//     },
//   });
// });

// /* ----------------------------------
//    ✅ MODAL SUBMIT
// ---------------------------------- */
// app.view("invoice_modal", async ({ ack, view, body }) => {
//   await ack();

//   const v = view.state.values;

//   const payload = {
//     company: v.company.company_select.selected_option.value,
//     plantCode: v.plant.plant_select.selected_option.value,
//     plantName: v.plant_name.plant_name_input.value,
//     location: PLANTS.find(
//       (p) => p.plantCode === v.plant.plant_select.selected_option.value
//     )?.location,
//     billMonth: v.bill_month.value.selected_date,
//     invoiceNo: v.invoice_no.value.value,
//     amount: v.amount.value.value,
//     createdBy: body.user.id,
//   };

//   console.log("✅ FINAL PAYLOAD:", payload);

//   // Optionally, you can save the payload to your Bill API
//   try {
//     await pool.query(
//       `
//       INSERT INTO bills (company, plant_code, plant_name, location, bill_month, invoice_no, amount, created_by)
//       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
//       `,
//       [
//         payload.company,
//         payload.plantCode,
//         payload.plantName,
//         payload.location,
//         payload.billMonth,
//         payload.invoiceNo,
//         payload.amount,
//         payload.createdBy,
//       ]
//     );
//   } catch (err) {
//     console.error("Error saving invoice to DB:", err.message);
//   }
// });

// /* ----------------------------------
//    🚀 START
// ---------------------------------- */
// (async () => {
//   await initDb();
//   const PORT = process.env.PORT || 3000;
//   await app.start(PORT);
//   console.log(`⚡ Slack app running on ${PORT}`);
// })();



// // index.js
// import "dotenv/config";
// import express from "express";
// import pkg from "@slack/bolt";
// import cors from "cors";
// import bodyParser from "body-parser";
// import pg from "pg";

// import billRoutes from "./src/routes/bill.routes.js";

// const { App, ExpressReceiver } = pkg;
// const { Pool } = pg;

// /* ----------------------------------
//    🗄️ DATABASE
// ---------------------------------- */
// const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// export async function initDb() {
//   // Slack installation table
//   await pool.query(`
//     CREATE TABLE IF NOT EXISTS slack_installations (
//       id SERIAL PRIMARY KEY,
//       team_id TEXT UNIQUE NOT NULL,
//       team_name TEXT,
//       bot_token TEXT NOT NULL,
//       created_at TIMESTAMP DEFAULT NOW()
//     )
//   `);
// }

// /* ----------------------------------
//    🔌 EXPRESS RECEIVER + SLACK INSTALLATION
// ---------------------------------- */
// const receiver = new ExpressReceiver({
//   signingSecret: process.env.SLACK_SIGNING_SECRET,
//   clientId: process.env.SLACK_CLIENT_ID,
//   clientSecret: process.env.SLACK_CLIENT_SECRET,
//   stateSecret: process.env.SESSION_SECRET || "slack-secret",
//   scopes: ["commands", "chat:write"],
//   installerOptions: { redirectUriPath: "/slack/oauth_redirect", stateVerification: false },
//   installationStore: {
//     storeInstallation: async (installation) => {
//       await pool.query(
//         `INSERT INTO slack_installations (team_id, team_name, bot_token)
//          VALUES ($1,$2,$3)
//          ON CONFLICT (team_id) DO UPDATE SET bot_token = EXCLUDED.bot_token`,
//         [installation.team.id, installation.team.name, installation.bot.token]
//       );
//     },
//     fetchInstallation: async ({ teamId }) => {
//       const res = await pool.query(`SELECT * FROM slack_installations WHERE team_id=$1`, [teamId]);
//       if (!res.rows.length) throw new Error("No installation found for team");
//       return { team: { id: res.rows[0].team_id }, bot: { token: res.rows[0].bot_token } };
//     },
//   },
// });

// /* ----------------------------------
//    🌐 EXPRESS APP
// ---------------------------------- */
// const expressApp = receiver.app;
// expressApp.use(express.json());
// expressApp.use(cors());
// expressApp.use(bodyParser.json());
// expressApp.use("/api/bill", billRoutes);
// expressApp.get("/", (_, res) => res.send("✅ Slack App Running"));

// /* ----------------------------------
//    🤖 SLACK APP
// ---------------------------------- */
// const app = new App({ receiver, processBeforeResponse: true });



// /* ----------------------------------
//    START
// ---------------------------------- */
// (async () => {
//   await initDb();
//   const PORT = process.env.PORT || 3000;
//   await app.start(PORT);
//   console.log(`⚡ Slack app running on ${PORT}`);
// })();



import "dotenv/config";
import express from "express";
import pkg from "@slack/bolt";
import cors from "cors";
import bodyParser from "body-parser";
import pg from "pg";

// ✅ Import your bill routes
import billRoutes from "./src/routes/bill.routes.js";

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
        "SELECT * FROM slack_installations WHERE team_id = $1",
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
expressApp.use(express.json());
expressApp.use(cors());
expressApp.use(bodyParser.json());

// ✅ Mount bill routes
expressApp.use("/api/bill", billRoutes);

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
              text: "Slack app successfully installed!* 🎉\n\nManage CRM actions directly from Slack.",
            },
          },
          { type: "divider" },
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
