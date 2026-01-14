// index.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { pool, initDb } from "./db/index.js"; // your new DB module
import pkg from "@slack/bolt";

import { createStudent } from "./controllers/student.controller.js";
const { App, ExpressReceiver } = pkg;


SUBJECTS = [
  { code: "CS101", name: "Computer Science Basics" },
  { code: "MA101", name: "Mathematics I" },
  { code: "PH101", name: "Physics I" },
]
/* ----------------------------------
   🌱 PLANTS
---------------------------------- */
const PLANTS = [
  { company: "LUMAX AUTO TECH LTD", plantCode: "7020", plantName: "LMPL PCNT PUNE-7020", location: "Pune" },
  { company: "LUMAX AUTO TECH LTD", plantCode: "7030", plantName: "LMPL CHAKAN-7030", location: "Chakan" },
];

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
});

/* ----------------------------------
   🌐 EXPRESS APP
---------------------------------- */
const expressApp = receiver.app;
expressApp.use(cors());
expressApp.use(bodyParser.json());

// Health check
expressApp.get("/", (_, res) => res.send("✅ Slack App Running"));

/* ----------------------------------
   ⚡ SLACK APP
---------------------------------- */
const app = new App({ receiver, processBeforeResponse: true });

/* ----------------------------------
   🧱 MODAL BUILDER
---------------------------------- */

const buildStudentModal = (subjectCode = "", subjectName = "") => ({
  type: "modal",
  callback_id: "student_register_modal",
  title: { type: "plain_text", text: "Register Student" },
  submit: { type: "plain_text", text: "Save" },
  close: { type: "plain_text", text: "Cancel" },
  blocks: [
    {
      type: "input",
      block_id: "student_name",
      label: { type: "plain_text", text: "Student Name" },
      element: {
        type: "plain_text_input",
        action_id: "student_name_input",
      },
    },
    {
      type: "input",
      block_id: "roll_no",
      label: { type: "plain_text", text: "Roll Number" },
      element: {
        type: "plain_text_input",
        action_id: "roll_no_input",
      },
    },
    {
      type: "input",
      block_id: "subject_code",
      label: { type: "plain_text", text: "Subject Code" },
      element: {
        type: "static_select",
        action_id: "subject_code_select",
        options: SUBJECTS.map(s => ({
          text: { type: "plain_text", text: s.code },
          value: s.code,
        })),
      },
    },
    {
      type: "input",
      block_id: "subject_name",
      label: { type: "plain_text", text: "Subject Name" },
      element: {
        type: "plain_text_input",
        action_id: "subject_name_input",
        initial_value: subjectName,
      },
    },
  ],
});

const buildInvoiceModal = (plantCode = "", plantName = "") => {
  const initialPlant = PLANTS.find((p) => p.plantCode === plantCode);

  return {
    type: "modal",
    callback_id: "invoice_modal",
    title: { type: "plain_text", text: "Create Invoice" },
    submit: { type: "plain_text", text: "Submit" },
    close: { type: "plain_text", text: "Cancel" },
    blocks: [
      {
        type: "input",
        block_id: "company",
        label: { type: "plain_text", text: "Company" },
        element: {
          type: "static_select",
          action_id: "company_select",
          options: [{ text: { type: "plain_text", text: "LUMAX AUTO TECH LTD" }, value: "LUMAX AUTO TECH LTD" }],
        },
      },
      {
        type: "input",
        block_id: "plant",
        label: { type: "plain_text", text: "Plant Code" },
        element: {
          type: "static_select",
          action_id: "plant_select",
          options: PLANTS.map((p) => ({ text: { type: "plain_text", text: p.plantCode }, value: p.plantCode })),
          initial_option: initialPlant
            ? { text: { type: "plain_text", text: initialPlant.plantCode }, value: initialPlant.plantCode }
            : undefined,
        },
      },
      {
        type: "input",
        block_id: "plant_name",
        label: { type: "plain_text", text: "Plant Name" },
        element: {
          type: "plain_text_input",
          action_id: "plant_name_input",
          initial_value: plantName || (initialPlant ? initialPlant.plantName : ""),
        },
      },
      {
        type: "input",
        block_id: "bill_month",
        label: { type: "plain_text", text: "Bill Month" },
        element: { type: "datepicker", action_id: "value" },
      },
      {
        type: "input",
        block_id: "contractor_name",
        label: { type: "plain_text", text: "Contractor Name" },
        element: { type: "plain_text_input", action_id: "value" },
      },
      {
        type: "input",
        block_id: "no_of_emp",
        label: { type: "plain_text", text: "No. of Employees" },
        element: { type: "plain_text_input", action_id: "value" },
        optional: true,
      },
      {
        type: "input",
        block_id: "mode",
        label: { type: "plain_text", text: "Mode" },
        element: {
          type: "static_select",
          action_id: "value",
          options: ["PIECE", "MONTHLY", "DAILY"].map((m) => ({ text: { type: "plain_text", text: m }, value: m })),
        },
      },
      {
        type: "input",
        block_id: "area_of_work",
        label: { type: "plain_text", text: "Area of Work" },
        element: { type: "plain_text_input", action_id: "value" },
        optional: true,
      },
      {
        type: "input",
        block_id: "max_emp_per_rc",
        label: { type: "plain_text", text: "Max Employees Per RC" },
        element: { type: "plain_text_input", action_id: "value" },
        optional: true,
      },
    ],
  };
};

/* ----------------------------------
   ⚡ /invoice COMMAND
---------------------------------- */

app.command("/invoice", async ({ ack, body, client }) => {
  await ack();
  await client.views.open({
    trigger_id: body.trigger_id,
    view: buildStudentModal(),
  });
});


// app.command("/invoice", async ({ ack, body, client }) => {
//   await ack();
//   await client.views.open({
//     trigger_id: body.trigger_id,
//     view: buildInvoiceModal(),
//   });
// });

/* ----------------------------------
   ⚡ PLANT SELECT AUTO-FILL
---------------------------------- */
app.action("plant_select", async ({ ack, body, client, action, view }) => {
  await ack();
  const selectedPlantCode = action.selected_option.value;
  const plant = PLANTS.find((p) => p.plantCode === selectedPlantCode);
  if (!plant) return;

  const updatedBlocks = view.blocks.map((block) => {
    if (block.block_id === "plant_name") {
      return { ...block, element: { ...block.element, initial_value: plant.plantName } };
    }
    if (block.block_id === "plant") {
      return {
        ...block,
        element: { ...block.element, initial_option: { text: { type: "plain_text", text: plant.plantCode }, value: plant.plantCode } },
      };
    }
    return block;
  });

  await client.views.update({
    view_id: view.id,
    hash: view.hash,
    view: { ...view, blocks: updatedBlocks },
  });
});

app.action("subject_code_select", async ({ ack, body, action, client, view }) => {
  await ack();

  const selectedCode = action.selected_option.value;
  const subject = SUBJECTS.find(s => s.code === selectedCode);
  if (!subject) return;

  const updatedBlocks = view.blocks.map(block => {
    if (block.block_id === "subject_name") {
      return {
        ...block,
        element: {
          ...block.element,
          initial_value: subject.name,
        },
      };
    }
    return block;
  });

  await client.views.update({
    view_id: view.id,
    hash: view.hash,
    view: {
      ...view,
      blocks: updatedBlocks,
    },
  });
});


/* ----------------------------------
   ⚡ MODAL SUBMIT
---------------------------------- */
app.view("invoice_modal", async ({ ack, view, body }) => {
  await ack();

  try {
    const v = view.state.values;

    const payload = {
      companyName: v.company?.company_select?.selected_option?.value || "",
      plantCode: v.plant?.plant_select?.selected_option?.value || "",
      plantName: v.plant_name?.plant_name_input?.value || "",
      location: PLANTS.find((p) => p.plantCode === v.plant?.plant_select?.selected_option?.value)?.location || "",
      billMonth: v.bill_month?.value?.selected_date,
      contractorName: v.contractor_name?.value?.value || "",
      noOfEmp: parseInt(v.no_of_emp?.value?.value) || null,
      mode: v.mode?.value?.selected_option?.value || null,
      areaOfWork: v.area_of_work?.value?.value || null,
      maxEmpPerRC: parseInt(v.max_emp_per_rc?.value?.value) || null,
      createdBy: body.user.id,
    };

    // Insert into bill_requests
    const res = await pool.query(
      `INSERT INTO bill_requests
       (company_name, plant_code, plant_name, location, bill_month, contractor_name, no_of_emp_as_on_date, mode, area_of_work, max_employees_per_rc)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id`,
      [
        payload.companyName,
        payload.plantCode,
        payload.plantName,
        payload.location,
        payload.billMonth,
        payload.contractorName,
        payload.noOfEmp,
        payload.mode,
        payload.areaOfWork,
        payload.maxEmpPerRC,
      ]
    );

    const billRequestId = res.rows[0].id;
    console.log("✅ Bill request created:", billRequestId);
  } catch (err) {
    console.error("❌ Error saving bill request:", err.message);
  }
});

app.view("student_register_modal", async ({ ack, view }) => {
  await ack();

  const v = view.state.values;

  await createStudent({
    studentName: v.student_name.student_name_input.value,
    rollNo: v.roll_no.roll_no_input.value,
    subjectCode: v.subject_code.subject_code_select.selected_option.value,
    subjectName: v.subject_name.subject_name_input.value,
  });

  console.log("✅ Student registered");
});


/* ----------------------------------
   🌱 INIT DB ON START
---------------------------------- */
await initDb();
console.log("✅ DB Initialized");

/* ----------------------------------
   🚀 EXPORT FOR VERCEL / SERVERLESS
---------------------------------- */
export default expressApp;
