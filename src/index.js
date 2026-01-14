


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
import fetch from "node-fetch";

import billRoutes from "./routes/bill.routes.js";

const { App, ExpressReceiver } = pkg;
const { Pool } = pg;

/* ----------------------------------
   🗄️ DATABASE
---------------------------------- */
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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
   🔌 EXPRESS RECEIVER + SLACK INSTALLATION
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
      await pool.query(
        `INSERT INTO slack_installations (team_id, team_name, bot_token)
         VALUES ($1,$2,$3)
         ON CONFLICT (team_id) DO UPDATE SET bot_token = EXCLUDED.bot_token`,
        [installation.team.id, installation.team.name, installation.bot.token]
      );
    },
    fetchInstallation: async ({ teamId }) => {
      const res = await pool.query(`SELECT * FROM slack_installations WHERE team_id=$1`, [teamId]);
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
expressApp.use("/api/bill", billRoutes);
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
   🧱 MODAL BUILDER (MULTIPLE INVOICES)
---------------------------------- */
const buildInvoiceModal = (invoiceRows = [], initialPlantName = "") => {
  if (invoiceRows.length === 0) invoiceRows.push({}); // start with one empty invoice

  const invoiceBlocks = invoiceRows.flatMap((inv, idx) => [
    {
      type: "header",
      text: { type: "plain_text", text: `Invoice #${idx + 1}` }
    },
    {
      type: "input",
      block_id: `invoiceNo_${idx}`,
      label: { type: "plain_text", text: "Invoice No" },
      element: { type: "plain_text_input", action_id: "invoiceNo", initial_value: inv.invoiceNo || "" }
    },
    {
      type: "input",
      block_id: `invoiceDate_${idx}`,
      label: { type: "plain_text", text: "Invoice Date" },
      element: { type: "datepicker", action_id: "invoiceDate", initial_date: inv.invoiceDate || undefined }
    },
    {
      type: "input",
      block_id: `invoiceType_${idx}`,
      label: { type: "plain_text", text: "Invoice Type" },
      element: {
        type: "static_select",
        action_id: "invoiceType",
        initial_option: inv.invoiceType
          ? { text: { type: "plain_text", text: inv.invoiceType }, value: inv.invoiceType }
          : undefined,
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
        element: { type: "datepicker", action_id: "value" } },
      { type: "input", block_id: "contractor_name", label: { type: "plain_text", text: "Contractor Name" },
        element: { type: "plain_text_input", action_id: "value" } },
      { type: "input", block_id: "no_of_employees", label: { type: "plain_text", text: "No of Employees" },
        element: { type: "plain_text_input", action_id: "value" } },
      { type: "input", block_id: "mode", label: { type: "plain_text", text: "Mode" },
        element: { type: "static_select", action_id: "value",
          options: [
            { text: { type: "plain_text", text: "MONTHLY" }, value: "MONTHLY" },
            { text: { type: "plain_text", text: "DAILY" }, value: "DAILY" }
          ] } },
      { type: "input", block_id: "area_of_work", label: { type: "plain_text", text: "Area of Work" },
        element: { type: "plain_text_input", action_id: "value" } },
      { type: "input", block_id: "max_employees_per_rc", label: { type: "plain_text", text: "Max Employees Per RC" },
        element: { type: "plain_text_input", action_id: "value" } },
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
   /invoice COMMAND
---------------------------------- */
app.command("/invoice", async ({ ack, body, client }) => {
  await ack();
  await client.views.open({ trigger_id: body.trigger_id, view: buildInvoiceModal() });
});

/* ----------------------------------
   AUTO-FILL PLANT NAME
---------------------------------- */
app.action("plant_select", async ({ ack, action, client, view }) => {
  await ack();
  const selectedPlant = PLANTS.find(p => p.plantCode === action.selected_option.value);
  if (!selectedPlant) return;
  const updatedView = buildInvoiceModal([], selectedPlant.plantName);
  await client.views.update({ view_id: view.id, hash: view.hash, view: updatedView });
});

/* ----------------------------------
   ADD INVOICE ROW
---------------------------------- */
app.action("add_invoice", async ({ ack, body, client }) => {
  await ack();
  const currentBlocks = body.view.blocks.filter(b => b.block_id && b.block_id.startsWith("invoiceNo"));
  const invoiceRows = currentBlocks.map((_, idx) => ({
    invoiceNo: body.view.state.values[`invoiceNo_${idx}`]?.invoiceNo?.value || "",
    amount: body.view.state.values[`amount_${idx}`]?.amount?.value || "",
    serviceCharge: body.view.state.values[`serviceCharge_${idx}`]?.serviceCharge?.value || "",
    esi: body.view.state.values[`esi_${idx}`]?.esi?.value || "",
    pf: body.view.state.values[`pf_${idx}`]?.pf?.value || "",
    pt: body.view.state.values[`pt_${idx}`]?.pt?.value || "",
    lwf: body.view.state.values[`lwf_${idx}`]?.lwf?.value || "",
    total: body.view.state.values[`total_${idx}`]?.total?.value || "",
    remarks: body.view.state.values[`remarks_${idx}`]?.remarks?.value || "",
    fileUrl: body.view.state.values[`fileUrl_${idx}`]?.fileUrl?.value || "",
    invoiceType: body.view.state.values[`invoiceType_${idx}`]?.invoiceType?.selected_option?.value || "",
    invoiceDate: body.view.state.values[`invoiceDate_${idx}`]?.invoiceDate?.selected_date || ""
  }));

  invoiceRows.push({}); // add empty row
  await client.views.update({ view_id: body.view.id, hash: body.view.hash, view: buildInvoiceModal(invoiceRows) });
});

/* ----------------------------------
   MODAL SUBMIT -> POST TO /api/bill
---------------------------------- */
app.view("invoice_modal", async ({ ack, view, body }) => {
  await ack();
  const v = view.state.values;

  const invoiceRows = Object.keys(v)
    .filter(k => k.startsWith("invoiceNo"))
    .map((blockId, idx) => ({
      invoiceNo: v[`invoiceNo_${idx}`].invoiceNo.value,
      invoiceDate: v[`invoiceDate_${idx}`].invoiceDate.selected_date,
      invoiceType: v[`invoiceType_${idx}`].invoiceType.selected_option.value,
      amount: v[`amount_${idx}`].amount.value,
      serviceCharge: v[`serviceCharge_${idx}`].serviceCharge.value,
      esi: v[`esi_${idx}`].esi.value,
      pf: v[`pf_${idx}`].pf.value,
      pt: v[`pt_${idx}`].pt.value,
      lwf: v[`lwf_${idx}`].lwf.value,
      total: v[`total_${idx}`].total.value,
      remarks: v[`remarks_${idx}`].remarks.value,
      fileUrl: v[`fileUrl_${idx}`].fileUrl.value
    }));

  const payload = {
    companyName: v.company.company_select.selected_option.value,
    plantCode: v.plant.plant_select.selected_option.value,
    plantName: v.plant_name.plant_name_input.value,
    location: PLANTS.find(p => p.plantCode === v.plant.plant_select.selected_option.value)?.location,
    billMonth: v.bill_month.value.selected_date,
    contractorName: v.contractor_name.value.value,
    noOfEmployees: v.no_of_employees.value.value,
    mode: v.mode.value.selected_option.value,
    areaOfWork: v.area_of_work.value.value,
    maxEmployeesPerRC: v.max_employees_per_rc.value.value,
    invoices: invoiceRows,
    createdBy: body.user.id
  };

  console.log("✅ Payload to API:", payload);

  await fetch("http://localhost:3000/api/bill", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
});

/* ----------------------------------
   START
---------------------------------- */
(async () => {
  await initDb();
  const PORT = process.env.PORT || 3000;
  await app.start(PORT);
  console.log(`⚡ Slack app running on ${PORT}`);
})();
