


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



// src/index.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fetch from "node-fetch";

import pkg from "@slack/bolt";
const { App, ExpressReceiver } = pkg;

import { pool, initDb } from "./db/index.js";
import billRoutes from "./routes/bill.routes.js";

/* ----------------------------------
   🔌 EXPRESS RECEIVER + SLACK
---------------------------------- */
const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  stateSecret: process.env.SESSION_SECRET || "slack-secret",
  scopes: ["commands", "chat:write"],
  installerOptions: { redirectUriPath: "/slack/oauth_redirect", stateVerification: false },
  installationStore: {
    storeInstallation: async (installation) => {
      try {
        await pool.query(
          `INSERT INTO slack_installations (team_id, team_name, bot_token)
           VALUES ($1,$2,$3)
           ON CONFLICT (team_id) DO UPDATE SET bot_token = EXCLUDED.bot_token`,
          [installation.team.id, installation.team.name, installation.bot.token]
        );
      } catch (err) {
        console.error("❌ Error storing installation:", err);
        throw err;
      }
    },
    fetchInstallation: async ({ teamId }) => {
      try {
        const res = await pool.query(`SELECT * FROM slack_installations WHERE team_id=$1`, [teamId]);
        if (!res.rows.length) throw new Error("No installation found for team");
        return { team: { id: res.rows[0].team_id }, bot: { token: res.rows[0].bot_token } };
      } catch (err) {
        console.error("❌ Error fetching installation:", err);
        throw err;
      }
    },
  },
});

/* ----------------------------------
   🌐 EXPRESS APP
---------------------------------- */
const app = receiver.app;
app.use(cors());
app.use(bodyParser.json());
app.use("/api/bill", billRoutes);
app.get("/", (_, res) => res.send("✅ Slack App Running"));

/* ----------------------------------
   🌱 INIT DATABASE
---------------------------------- */
try {
  await initDb();
  console.log("✅ Database initialized successfully");
} catch (err) {
  console.error("❌ Failed to initialize database:", err);
  process.exit(1); // stop if DB cannot connect
}

/* ----------------------------------
   🧱 PLANTS LIST
---------------------------------- */
const PLANTS = [
  { company: "LUMAX AUTO TECH LTD", plantCode: "7020", plantName: "LMPL PCNT PUNE-7020", location: "Pune" },
  { company: "LUMAX AUTO TECH LTD", plantCode: "7030", plantName: "LMPL CHAKAN-7030", location: "Chakan" },
];

/* ----------------------------------
   📄 BUILD INVOICE MODAL
---------------------------------- */
const buildInvoiceModal = (invoiceRows = [], initialPlantName = "") => {
  if (invoiceRows.length === 0) invoiceRows.push({});

  const invoiceBlocks = invoiceRows.flatMap((inv, idx) => [
    { type: "header", text: { type: "plain_text", text: `Invoice #${idx + 1}` } },
    { type: "input", block_id: `invoiceNo_${idx}`, label: { type: "plain_text", text: "Invoice No" },
      element: { type: "plain_text_input", action_id: "invoiceNo", initial_value: inv.invoiceNo || "" } },
    { type: "input", block_id: `invoiceDate_${idx}`, label: { type: "plain_text", text: "Invoice Date" },
      element: { type: "datepicker", action_id: "invoiceDate", initial_date: inv.invoiceDate || undefined } },
    { type: "input", block_id: `invoiceType_${idx}`, label: { type: "plain_text", text: "Invoice Type" },
      element: {
        type: "static_select",
        action_id: "invoiceType",
        initial_option: inv.invoiceType ? { text: { type: "plain_text", text: inv.invoiceType }, value: inv.invoiceType } : undefined,
        options: [
          { text: { type: "plain_text", text: "SERVICE" }, value: "SERVICE" },
          { text: { type: "plain_text", text: "PRODUCT" }, value: "PRODUCT" }
        ]
      }
    },
    { type: "input", block_id: `amount_${idx}`, label: { type: "plain_text", text: "Amount" },
      element: { type: "plain_text_input", action_id: "amount", initial_value: inv.amount || "" } },
    { type: "input", block_id: `serviceCharge_${idx}`, label: { type: "plain_text", text: "Service Charge" },
      element: { type: "plain_text_input", action_id: "serviceCharge", initial_value: inv.serviceCharge || "" } },
    { type: "input", block_id: `esi_${idx}`, label: { type: "plain_text", text: "ESI" },
      element: { type: "plain_text_input", action_id: "esi", initial_value: inv.esi || "" } },
    { type: "input", block_id: `pf_${idx}`, label: { type: "plain_text", text: "PF" },
      element: { type: "plain_text_input", action_id: "pf", initial_value: inv.pf || "" } },
    { type: "input", block_id: `pt_${idx}`, label: { type: "plain_text", text: "PT" },
      element: { type: "plain_text_input", action_id: "pt", initial_value: inv.pt || "" } },
    { type: "input", block_id: `lwf_${idx}`, label: { type: "plain_text", text: "LWF" },
      element: { type: "plain_text_input", action_id: "lwf", initial_value: inv.lwf || "" } },
    { type: "input", block_id: `total_${idx}`, label: { type: "plain_text", text: "Total" },
      element: { type: "plain_text_input", action_id: "total", initial_value: inv.total || "" } },
    { type: "input", block_id: `remarks_${idx}`, label: { type: "plain_text", text: "Remarks" },
      element: { type: "plain_text_input", action_id: "remarks", initial_value: inv.remarks || "" } },
    { type: "input", block_id: `fileUrl_${idx}`, label: { type: "plain_text", text: "Invoice File URL" },
      element: { type: "plain_text_input", action_id: "fileUrl", initial_value: inv.fileUrl || "" } }
  ]);

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
      { type: "input", block_id: "bill_month", label: { type: "plain_text", text: "Bill Month" },
        element: { type: "datepicker", action_id: "billMonth" } },
      { type: "input", block_id: "contractor_name", label: { type: "plain_text", text: "Contractor Name" },
        element: { type: "plain_text_input", action_id: "contractorName" } },
      { type: "input", block_id: "no_of_employees", label: { type: "plain_text", text: "No of Employees" },
        element: { type: "plain_text_input", action_id: "noOfEmployees" } },
      { type: "input", block_id: "mode", label: { type: "plain_text", text: "Mode" },
        element: { type: "static_select", action_id: "mode",
          options: [
            { text: { type: "plain_text", text: "MONTHLY" }, value: "MONTHLY" },
            { text: { type: "plain_text", text: "DAILY" }, value: "DAILY" }
          ] } },
      { type: "input", block_id: "area_of_work", label: { type: "plain_text", text: "Area of Work" },
        element: { type: "plain_text_input", action_id: "areaOfWork" } },
      { type: "input", block_id: "max_employees_per_rc", label: { type: "plain_text", text: "Max Employees Per RC" },
        element: { type: "plain_text_input", action_id: "maxEmployeesPerRC" } },
      ...invoiceBlocks,
      {
        type: "actions",
        block_id: "add_invoice_btn",
        elements: [{ type: "button", text: { type: "plain_text", text: "Add Invoice" }, action_id: "add_invoice" }]
      }
    ]
  };
};

/* ----------------------------------
   ⚡ SLACK APP
---------------------------------- */
const slackApp = new App({ receiver, processBeforeResponse: true });

// OPEN MODAL
slackApp.command("/invoice", async ({ ack, body, client }) => {
  await ack();
  await client.views.open({ trigger_id: body.trigger_id, view: buildInvoiceModal() });
});

// ADD INVOICE ROW
slackApp.action("add_invoice", async ({ ack, body, client }) => {
  await ack();
  try {
    const v = body.view.state.values;
    const invoiceRows = [];
    let idx = 0;
    while (v[`invoiceNo_${idx}`]) {
      invoiceRows.push({
        invoiceNo: v[`invoiceNo_${idx}`]?.invoiceNo?.value || "",
        invoiceDate: v[`invoiceDate_${idx}`]?.invoiceDate?.selected_date || "",
        invoiceType: v[`invoiceType_${idx}`]?.invoiceType?.selected_option?.value || "",
        amount: v[`amount_${idx}`]?.amount?.value || "",
        serviceCharge: v[`serviceCharge_${idx}`]?.serviceCharge?.value || "",
        esi: v[`esi_${idx}`]?.esi?.value || "",
        pf: v[`pf_${idx}`]?.pf?.value || "",
        pt: v[`pt_${idx}`]?.pt?.value || "",
        lwf: v[`lwf_${idx}`]?.lwf?.value || "",
        total: v[`total_${idx}`]?.total?.value || "",
        remarks: v[`remarks_${idx}`]?.remarks?.value || "",
        fileUrl: v[`fileUrl_${idx}`]?.fileUrl?.value || ""
      });
      idx++;
    }
    invoiceRows.push({});
    await client.views.update({ view_id: body.view.id, hash: body.view.hash, view: buildInvoiceModal(invoiceRows) });
  } catch (err) {
    console.error("❌ Error adding invoice row:", err);
    await client.chat.postMessage({ channel: body.user.id, text: `❌ Error adding new invoice row: ${err.message}` });
  }
});

// MODAL SUBMIT
slackApp.view("invoice_modal", async ({ ack, view, body, client }) => {
  await ack();
  try {
    const v = view.state.values;
    console.log("🔹 Slack modal payload:", JSON.stringify(v, null, 2));

    const invoiceRows = [];
    let idx = 0;
    while (v[`invoiceNo_${idx}`]) {
      invoiceRows.push({
        invoiceNo: v[`invoiceNo_${idx}`]?.invoiceNo?.value || "",
        invoiceDate: v[`invoiceDate_${idx}`]?.invoiceDate?.selected_date || "",
        invoiceType: v[`invoiceType_${idx}`]?.invoiceType?.selected_option?.value || "",
        amount: Number(v[`amount_${idx}`]?.amount?.value || 0),
        serviceCharge: Number(v[`serviceCharge_${idx}`]?.serviceCharge?.value || 0),
        esi: Number(v[`esi_${idx}`]?.esi?.value || 0),
        pf: Number(v[`pf_${idx}`]?.pf?.value || 0),
        pt: Number(v[`pt_${idx}`]?.pt?.value || 0),
        lwf: Number(v[`lwf_${idx}`]?.lwf?.value || 0),
        total: Number(v[`total_${idx}`]?.total?.value || 0),
        remarks: v[`remarks_${idx}`]?.remarks?.value || "",
        fileUrl: v[`fileUrl_${idx}`]?.fileUrl?.value || ""
      });
      idx++;
    }

    const payload = {
      companyName: v.company?.company_select?.selected_option?.value || "",
      plantCode: v.plant?.plant_select?.selected_option?.value || "",
      plantName: v.plant_name?.plant_name_input?.value || "",
      location: PLANTS.find(p => p.plantCode === v.plant?.plant_select?.selected_option?.value)?.location || "",
      billMonth: v.bill_month?.billMonth?.selected_date || "",
      contractorName: v.contractor_name?.contractorName?.value || "",
      noOfEmployees: Number(v.no_of_employees?.noOfEmployees?.value || 0),
      mode: v.mode?.mode?.selected_option?.value || "",
      areaOfWork: v.area_of_work?.areaOfWork?.value || "",
      maxEmployeesPerRC: Number(v.max_employees_per_rc?.maxEmployeesPerRC?.value || 0),
      invoices: invoiceRows,
      createdBy: body.user.id
    };

    console.log("🔹 Payload to API:", JSON.stringify(payload, null, 2));

    const apiUrl = process.env.BASE_URL || "http://localhost:3000";
    const res = await fetch(`${apiUrl}/api/bill`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const resText = await res.text();
    if (!res.ok) {
      console.error("❌ API Error Response:", resText);
      await client.chat.postMessage({ channel: body.user.id, text: `❌ Failed to create bill. API responded: ${resText}` });
    } else {
      console.log("✅ API Success Response:", resText);
      await client.chat.postMessage({ channel: body.user.id, text: "✅ Bill created successfully!" });
    }

  } catch (err) {
    console.error("❌ Error processing Slack view submission:", err);
    await client.chat.postMessage({ channel: body.user.id, text: `❌ Something went wrong: ${err.message}` });
  }
});

/* ----------------------------------
   🌍 GLOBAL ERROR HANDLERS
---------------------------------- */
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
});

/* ----------------------------------
   🚀 START SERVER (LOCAL TESTING)
---------------------------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));

export default receiver.app;
