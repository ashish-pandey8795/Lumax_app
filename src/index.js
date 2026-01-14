


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

import pkg from "@slack/bolt";
const { App, ExpressReceiver } = pkg;

import { pool, initDb } from "./db/index.js";

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
});

/* ----------------------------------
   🌐 EXPRESS APP
---------------------------------- */
const app = receiver.app;
app.use(cors());
app.use(bodyParser.json());
app.get("/", (_, res) => res.send("✅ Slack App Running"));

/* ----------------------------------
   🌱 INIT DATABASE
---------------------------------- */
try {
  await initDb();
  console.log("✅ Database initialized successfully");
} catch (err) {
  console.error("❌ Failed to initialize database:", err);
  process.exit(1);
}

/* ----------------------------------
   🔹 STUDENT REGISTRATION DATA
---------------------------------- */
const SUBJECTS = [
  { code: "M101", name: "Mathematics" },
  { code: "P101", name: "Physics" },
  { code: "C101", name: "Chemistry" },
];

const subjectMap = SUBJECTS.reduce((acc, s) => {
  acc[s.code] = s.name;
  return acc;
}, {});

/* ----------------------------------
   🔹 BUILD STUDENT REGISTRATION MODAL
---------------------------------- */
const buildStudentModal = (initialSubjectName = "") => ({
  type: "modal",
  callback_id: "student_registration_modal",
  title: { type: "plain_text", text: "Student Registration" },
  submit: { type: "plain_text", text: "Submit" },
  close: { type: "plain_text", text: "Cancel" },
  blocks: [
    {
      type: "input",
      block_id: "student_name_block",
      label: { type: "plain_text", text: "Student Name" },
      element: { type: "plain_text_input", action_id: "student_name" }
    },
    {
      type: "input",
      block_id: "subject_code_block",
      label: { type: "plain_text", text: "Subject Code" },
      element: {
        type: "static_select",
        action_id: "subject_code",
        placeholder: { type: "plain_text", text: "Select Subject Code" },
        options: SUBJECTS.map(s => ({
          text: { type: "plain_text", text: s.code },
          value: s.code
        }))
      }
    },
    {
      type: "input",
      block_id: "subject_name_block",
      label: { type: "plain_text", text: "Subject Name" },
      element: {
        type: "plain_text_input",
        action_id: "subject_name",
        initial_value: initialSubjectName,
        placeholder: { type: "plain_text", text: "Auto-filled after selecting code" }
      }
    }
  ]
});

/* ----------------------------------
   ⚡ SLACK APP
---------------------------------- */
const slackApp = new App({ receiver, processBeforeResponse: true });

/* ------------------------
   OPEN STUDENT MODAL
------------------------ */
slackApp.command("/invoice", async ({ ack, body, client }) => {
  await ack();
  try {
    await client.views.open({ trigger_id: body.trigger_id, view: buildStudentModal() });
  } catch (err) {
    console.error("❌ Error opening student modal:", err);
  }
});

/* ------------------------
   HANDLE SUBJECT CODE SELECTION
------------------------ */
slackApp.action("subject_code", async ({ ack, body, client }) => {
  await ack();

  try {
    const selectedCode = body.actions[0].selected_option.value;
    const subjectName = subjectMap[selectedCode] || "";

    // Replace subject_name block with updated initial_value
    const updatedBlocks = body.view.blocks.map(block => {
      if (block.block_id === "subject_name_block") {
        return {
          ...block,
          element: {
            ...block.element,
            initial_value: subjectName
          }
        };
      }
      return block;
    });

    await client.views.update({
      view_id: body.view.id,
      hash: body.view.hash,
      view: {
        type: "modal",
        callback_id: "student_registration_modal",
        title: { type: "plain_text", text: "Student Registration" },
        submit: { type: "plain_text", text: "Submit" },
        close: { type: "plain_text", text: "Cancel" },
        blocks: updatedBlocks
      }
    });
  } catch (err) {
    console.error("❌ Error updating subject name:", err);
  }
});

/* ------------------------
   HANDLE STUDENT MODAL SUBMISSION
------------------------ */
slackApp.view("student_registration_modal", async ({ ack, view, body, client }) => {
  await ack();

  try {
    const v = view.state.values;
    const studentName = v.student_name_block.student_name.value;
    const subjectCode = v.subject_code_block.subject_code.selected_option.value;
    const subjectName = v.subject_name_block.subject_name.value;

    console.log("🔹 Student Registration Payload:", { studentName, subjectCode, subjectName });

    // Save to DB (example)
    // await pool.query('INSERT INTO students(name, code, subject) VALUES($1,$2,$3)', [studentName, subjectCode, subjectName]);

    await client.chat.postMessage({
      channel: body.user.id,
      text: `✅ Student Registered!\n*Name:* ${studentName}\n*Subject Code:* ${subjectCode}\n*Subject Name:* ${subjectName}`
    });
  } catch (err) {
    console.error("❌ Error processing student registration:", err);
    await client.chat.postMessage({ channel: body.user.id, text: `❌ Failed to register student: ${err.message}` });
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
   🚀 START SERVER
---------------------------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));

export default receiver.app;
