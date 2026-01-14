


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







// index.js
import "dotenv/config";
import express from "express";
import pkg from "@slack/bolt";
import cors from "cors";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";

import billRoutes from "./routes/bill.routes.js"; // Bill routes

const { App, ExpressReceiver } = pkg;
const { Pool } = pg;

/* ----------------------------------
   🗄️ DATABASE
---------------------------------- */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS slack_installations (
      id SERIAL PRIMARY KEY,
      team_id TEXT UNIQUE NOT NULL,
      team_name TEXT,
      bot_token TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

/* ----------------------------------
   🔌 EXPRESS RECEIVER
---------------------------------- */
const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  stateSecret: process.env.SESSION_SECRET || "slack-secret",
  scopes: ["commands", "chat:write"],
  installerOptions: {
    redirectUriPath: "/slack/oauth_redirect",
    stateVerification: false,
  },
  installationStore: {
    storeInstallation: async (installation) => {
      await pool.query(
        `INSERT INTO slack_installations (team_id, team_name, bot_token)
         VALUES ($1,$2,$3)
         ON CONFLICT (team_id) DO UPDATE SET bot_token = EXCLUDED.bot_token`,
        [installation.team.id, installation.team.name, installation.bot.token]
      );
    },
    fetchInstallation: async ({ teamId }) => {
      const res = await pool.query(
        `SELECT * FROM slack_installations WHERE team_id=$1`,
        [teamId]
      );
      if (!res.rows.length) throw new Error("No installation found for team");
      return { team: { id: res.rows[0].team_id }, bot: { token: res.rows[0].bot_token } };
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

// Bill API routes
expressApp.use("/api/bill", billRoutes);

// Health check
expressApp.get("/", (_, res) => res.send("✅ Slack App Running"));

/* ----------------------------------
   🤖 SLACK APP
---------------------------------- */
const app = new App({ receiver, processBeforeResponse: true });

/* ----------------------------------
   🌱 PLANT MASTER
---------------------------------- */
const PLANTS = [
  { company: "LUMAX AUTO TECH LTD", plantCode: "7020", plantName: "LMPL PCNT PUNE-7020", location: "Pune" },
  { company: "LUMAX AUTO TECH LTD", plantCode: "7030", plantName: "LMPL CHAKAN-7030", location: "Chakan" },
];

/* ----------------------------------
   🧱 MODAL BUILDER WITH DYNAMIC INVOICES
---------------------------------- */
let invoiceCounter = 1;

const defaultInvoiceBlock = (count = 1) => ({
  block_id: `invoice_${count}`,
  type: "input",
  label: { type: "plain_text", text: `Invoice ${count}` },
  element: {
    type: "plain_text_input",
    action_id: "invoice_json",
    multiline: true,
    placeholder: { type: "plain_text", text: `Enter JSON for invoice ${count}` },
    initial_value: JSON.stringify({
      invoiceNo: "",
      invoiceDate: "",
      invoiceType: "SERVICE",
      amount: 0,
      serviceCharge: 0,
      esi: 0,
      pf: 0,
      pt: 0,
      lwf: 0,
      total: 0,
      remarks: "",
      fileUrl: ""
    }, null, 2),
  },
});

const buildInvoiceModal = (initialPlantName = "", invoiceBlocks = []) => {
  if (invoiceBlocks.length === 0) invoiceBlocks.push(defaultInvoiceBlock(1));

  return {
    type: "modal",
    callback_id: "invoice_modal",
    title: { type: "plain_text", text: "Create Invoice" },
    submit: { type: "plain_text", text: "Submit" },
    close: { type: "plain_text", text: "Cancel" },
    blocks: [
      { type: "input", block_id: "company", label: { type: "plain_text", text: "Company" },
        element: { type: "static_select", action_id: "company_select",
          options: [{ text: { type: "plain_text", text: "LUMAX AUTO TECH LTD" }, value: "LUMAX AUTO TECH LTD" }] } },
      { type: "input", block_id: "plant", label: { type: "plain_text", text: "Plant Code" },
        element: { type: "static_select", action_id: "plant_select",
          options: PLANTS.map(p => ({ text: { type: "plain_text", text: p.plantCode }, value: p.plantCode })) } },
      { type: "input", block_id: "plant_name", label: { type: "plain_text", text: "Plant Name" },
        element: { type: "plain_text_input", action_id: "plant_name_input", initial_value: initialPlantName } },
      { type: "input", block_id: "bill_month", label: { type: "plain_text", text: "Bill Month" }, element: { type: "datepicker", action_id: "value" } },
      { type: "input", block_id: "contractor_name", label: { type: "plain_text", text: "Contractor Name" }, element: { type: "plain_text_input", action_id: "value" } },
      { type: "input", block_id: "no_of_employees", label: { type: "plain_text", text: "No of Employees" }, element: { type: "plain_text_input", action_id: "value" } },
      { type: "input", block_id: "mode", label: { type: "plain_text", text: "Mode" },
        element: { type: "static_select", action_id: "value",
          options: [{ text: { type: "plain_text", text: "MONTHLY" }, value: "MONTHLY" }, { text: { type: "plain_text", text: "DAILY" }, value: "DAILY" }] } },
      { type: "input", block_id: "area_of_work", label: { type: "plain_text", text: "Area of Work" }, element: { type: "plain_text_input", action_id: "value" } },
      { type: "input", block_id: "max_employees_per_rc", label: { type: "plain_text", text: "Max Employees Per RC" }, element: { type: "plain_text_input", action_id: "value" } },

      ...invoiceBlocks,

      { type: "actions", block_id: "add_invoice_btn", elements: [
        { type: "button", text: { type: "plain_text", text: "Add More Invoice" }, action_id: "add_invoice", value: "add_invoice" }
      ]}
    ]
  };
};

/* ----------------------------------
   ⚡ /invoice COMMAND
---------------------------------- */
app.command("/invoice", async ({ ack, body, client }) => {
  await ack();
  invoiceCounter = 1;
  await client.views.open({ trigger_id: body.trigger_id, view: buildInvoiceModal() });
});

/* ----------------------------------
   ⚡ AUTO-FILL PLANT NAME
---------------------------------- */
app.action("plant_select", async ({ ack, body, client, action, view }) => {
  await ack();
  const selectedPlantCode = action.selected_option.value;
  const plant = PLANTS.find(p => p.plantCode === selectedPlantCode);
  if (!plant) return;

  const updatedView = buildInvoiceModal(plant.plantName, view.blocks.filter(b => b.block_id.startsWith("invoice_")));
  await client.views.update({ view_id: view.id, hash: view.hash, view: updatedView });
});

/* ----------------------------------
   ⚡ ADD MORE INVOICE
---------------------------------- */
app.action("add_invoice", async ({ ack, body, client, view }) => {
  await ack();
  invoiceCounter++;
  const newInvoiceBlock = defaultInvoiceBlock(invoiceCounter);

  const updatedBlocks = [...view.blocks];
  updatedBlocks.splice(updatedBlocks.length - 1, 0, newInvoiceBlock); // insert before add button

  await client.views.update({ view_id: view.id, hash: view.hash, view: { ...view, blocks: updatedBlocks } });
});

/* ----------------------------------
   ✅ MODAL SUBMIT -> POST /api/bill
---------------------------------- */
app.view("invoice_modal", async ({ ack, view, body }) => {
  await ack();
  const v = view.state.values;

  const invoices = Object.keys(v)
    .filter(k => k.startsWith("invoice_"))
    .map(k => { try { return JSON.parse(v[k].invoice_json.value); } catch { return null; } })
    .filter(Boolean);

  const payload = {
    companyName: v.company.company_select.selected_option.value,
    plantCode: v.plant.plant_select.selected_option.value,
    plantName: v.plant_name.plant_name_input.value,
    location: PLANTS.find(p => p.plantCode === v.plant.plant_select.selected_option.value)?.location,
    billMonth: v.bill_month.value.selected_date,
    contractorName: v.contractor_name.value.value,
    noOfEmployees: parseInt(v.no_of_employees.value.value, 10),
    mode: v.mode.value.selected_option.value,
    areaOfWork: v.area_of_work.value.value,
    maxEmployeesPerRC: parseInt(v.max_employees_per_rc.value.value, 10),
    invoices
  };

  console.log("✅ FINAL PAYLOAD:", payload);

  try { await axios.post("http://localhost:3000/api/bill", payload); console.log("✅ Posted to /api/bill"); }
  catch (err) { console.error("❌ Error posting to API:", err.message); }
});

/* ----------------------------------
   🚀 START
---------------------------------- */
(async () => {
  await initDb();
  const PORT = process.env.PORT || 3000;
  await app.start(PORT);
  console.log(`⚡ Slack app running on ${PORT}`);
})();
