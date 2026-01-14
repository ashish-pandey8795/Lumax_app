




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




const PLANTS = [
  {
    company: "LUMAX AUTO TECH LTD",
    plantCode: "7020",
    plantName: "LMPL PCNT PUNE-7020",
    location: "Pune"
  },
  {
    company: "LUMAX AUTO TECH LTD",
    plantCode: "7030",
    plantName: "LMPL CHAKAN-7030",
    location: "Chakan"
  }
];






app.command("/invoice", async ({ ack, body, client }) => {
  await ack();

  await client.views.open({
    trigger_id: body.trigger_id,
    view: {
      type: "modal",
      callback_id: "invoice_modal",
      title: { type: "plain_text", text: "Create Bill" },
      submit: { type: "plain_text", text: "Submit" },
      close: { type: "plain_text", text: "Cancel" },

      blocks: [
        {
          type: "input",
          block_id: "company",
          label: { type: "plain_text", text: "Company" },
          element: {
            type: "static_select",
            action_id: "value",
            options: [
              {
                text: { type: "plain_text", text: "LUMAX AUTO TECH LTD" },
                value: "LUMAX AUTO TECH LTD"
              }
            ]
          }
        },

        {
          type: "input",
          block_id: "plant",
          label: { type: "plain_text", text: "Plant Code" },
          element: {
            type: "static_select",
            action_id: "value",
            options: PLANTS.map(p => ({
              text: { type: "plain_text", text: p.plantCode },
              value: p.plantCode
            }))
          }
        },

        {
          type: "input",
          block_id: "bill_month",
          label: { type: "plain_text", text: "Bill For The Month" },
          element: {
            type: "datepicker",
            action_id: "value"
          }
        },

        {
          type: "input",
          block_id: "contractor",
          label: { type: "plain_text", text: "Contractor Name" },
          element: {
            type: "plain_text_input",
            action_id: "value"
          }
        },

        {
          type: "input",
          block_id: "no_of_emp",
          label: {
            type: "plain_text",
            text: "No. of Employees (as on date)"
          },
          element: {
            type: "plain_text_input",
            action_id: "value"
          }
        },

        {
          type: "input",
          block_id: "mode",
          label: { type: "plain_text", text: "Mode" },
          element: {
            type: "static_select",
            action_id: "value",
            options: [
              {
                text: { type: "plain_text", text: "Piece Rate" },
                value: "PIECE"
              },
              {
                text: { type: "plain_text", text: "Monthly Rate" },
                value: "MONTHLY"
              }
            ]
          }
        },

        { type: "divider" },

        {
          type: "input",
          block_id: "invoice_no",
          label: { type: "plain_text", text: "Invoice No" },
          element: {
            type: "plain_text_input",
            action_id: "value"
          }
        },

        {
          type: "input",
          block_id: "invoice_date",
          label: { type: "plain_text", text: "Invoice Date" },
          element: {
            type: "datepicker",
            action_id: "value"
          }
        },

        {
          type: "input",
          block_id: "amount",
          label: { type: "plain_text", text: "Amount (INR)" },
          element: {
            type: "plain_text_input",
            action_id: "value"
          }
        }
      ]
    }
  });
});






app.view("invoice_modal", async ({ ack, body, view }) => {
  await ack();

  const v = view.state.values;

  const plantCode =
    v.plant.value.selected_option.value;

  const plant = PLANTS.find(
    p => p.plantCode === plantCode
  );

  const payload = {
    companyName:
      v.company.value.selected_option.value,

    plantCode,
    plantName: plant.plantName,
    location: plant.location,

    billMonth:
      v.bill_month.value.selected_date,

    contractorName:
      v.contractor.value.value,

    noOfEmployees:
      Number(v.no_of_emp.value.value),

    mode:
      v.mode.value.selected_option.value,

    invoices: [
      {
        invoiceNo:
          v.invoice_no.value.value,
        invoiceDate:
          v.invoice_date.value.selected_date,
        amount:
          v.amount.value.value,
        total:
          v.amount.value.value
      }
    ]
  };

  console.log("✅ FINAL BILL PAYLOAD", payload);

  // 👉 yahin tum createBill(payload) call kar sakte ho
});


app.command("/invoice", ({ body }) => {
  console.log("🔥 Slash command triggered by:", body.user_id);
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
