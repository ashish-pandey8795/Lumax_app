import "dotenv/config";
import cors from "cors";
import bodyParser from "body-parser";
import { Pool } from "pg";
import billRoutes from "./routes/bill.routes.js";

// ✅ Correct Slack Bolt import for CommonJS package
import pkg from "@slack/bolt";
const { App, ExpressReceiver } = pkg;

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
        `
        INSERT INTO slack_installations (team_id, team_name, bot_token)
        VALUES ($1,$2,$3)
        ON CONFLICT (team_id)
        DO UPDATE SET bot_token = EXCLUDED.bot_token
        `,
        [installation.team.id, installation.team.name, installation.bot.token]
      );
    },

    fetchInstallation: async ({ teamId }) => {
      const res = await pool.query(
        `SELECT * FROM slack_installations WHERE team_id=$1`,
        [teamId]
      );
      if (!res.rows.length) throw new Error("No installation found for team");
      return {
        team: { id: res.rows[0].team_id },
        bot: { token: res.rows[0].bot_token },
      };
    },
  },
});

/* ----------------------------------
   🌐 EXPRESS APP
---------------------------------- */
const expressApp = receiver.app;
expressApp.use(cors());
expressApp.use(bodyParser.json());

// ✅ Bill API routes
expressApp.use("/api/bill", billRoutes);

// Health check
expressApp.get("/", (_, res) => {
  res.send("✅ Slack App Running");
});

/* ----------------------------------
   🌱 PLANT MASTER
---------------------------------- */
const PLANTS = [
  {
    company: "LUMAX AUTO TECH LTD",
    plantCode: "7020",
    plantName: "LMPL PCNT PUNE-7020",
    location: "Pune",
  },
  {
    company: "LUMAX AUTO TECH LTD",
    plantCode: "7030",
    plantName: "LMPL CHAKAN-7030",
    location: "Chakan",
  },
];

/* ----------------------------------
   🧱 MODAL BUILDER
---------------------------------- */
const buildInvoiceModal = (plantCode = "", plantName = "") => ({
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
        options: [
          {
            text: { type: "plain_text", text: "LUMAX AUTO TECH LTD" },
            value: "LUMAX AUTO TECH LTD",
          },
        ],
      },
    },
    {
      type: "input",
      block_id: "plant",
      label: { type: "plain_text", text: "Plant Code" },
      element: {
        type: "static_select",
        action_id: "plant_select",
        options: PLANTS.map((p) => ({
          text: { type: "plain_text", text: p.plantCode },
          value: p.plantCode,
        })),
        initial_option:
          plantCode &&
          PLANTS.find((p) => p.plantCode === plantCode) && {
            text: { type: "plain_text", text: plantCode },
            value: plantCode,
          },
      },
    },
    {
      type: "input",
      block_id: "plant_name",
      label: { type: "plain_text", text: "Plant Name" },
      element: {
        type: "plain_text_input",
        action_id: "plant_name_input",
        initial_value: plantName || "",
      },
    },
    {
      type: "input",
      block_id: "bill_month",
      label: { type: "plain_text", text: "Bill Month" },
      element: {
        type: "datepicker",
        action_id: "value",
      },
    },
    {
      type: "input",
      block_id: "invoice_no",
      label: { type: "plain_text", text: "Invoice No" },
      element: {
        type: "plain_text_input",
        action_id: "value",
      },
    },
    {
      type: "input",
      block_id: "amount",
      label: { type: "plain_text", text: "Amount (INR)" },
      element: {
        type: "plain_text_input",
        action_id: "value",
      },
    },
  ],
});

/* ----------------------------------
   ⚡ /invoice COMMAND
---------------------------------- */
const app = new App({ receiver, processBeforeResponse: true });

app.command("/invoice", async ({ ack, body, client }) => {
  await ack();
  await client.views.open({
    trigger_id: body.trigger_id,
    view: buildInvoiceModal(),
  });
});

/* ----------------------------------
   ⚡ AUTO-FILL PLANT NAME
---------------------------------- */
app.action("plant_select", async ({ ack, body, client, action, view }) => {
  await ack();
  const selectedPlantCode = action.selected_option.value;
  const plant = PLANTS.find((p) => p.plantCode === selectedPlantCode);
  if (!plant) return;

  const updatedBlocks = view.blocks.map((block) => {
    if (block.block_id === "plant_name") {
      return {
        ...block,
        element: {
          ...block.element,
          initial_value: plant.plantName,
        },
      };
    }
    if (block.block_id === "plant") {
      return {
        ...block,
        element: {
          ...block.element,
          initial_option: {
            text: { type: "plain_text", text: plant.plantCode },
            value: plant.plantCode,
          },
        },
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

/* ----------------------------------
   ✅ MODAL SUBMIT
---------------------------------- */
app.view("invoice_modal", async ({ ack, view, body }) => {
  await ack();
  const v = view.state.values;

  const payload = {
    company: v.company.company_select.selected_option.value,
    plantCode: v.plant.plant_select.selected_option.value,
    plantName: v.plant_name.plant_name_input.value,
    location: PLANTS.find(
      (p) => p.plantCode === v.plant.plant_select.selected_option.value
    )?.location,
    billMonth: v.bill_month.value.selected_date,
    invoiceNo: v.invoice_no.value.value,
    amount: v.amount.value.value,
    createdBy: body.user.id,
  };

  console.log("✅ FINAL PAYLOAD:", payload);

  try {
    await pool.query(
      `
      INSERT INTO bills (company, plant_code, plant_name, location, bill_month, invoice_no, amount, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `,
      [
        payload.company,
        payload.plantCode,
        payload.plantName,
        payload.location,
        payload.billMonth,
        payload.invoiceNo,
        payload.amount,
        payload.createdBy,
      ]
    );
  } catch (err) {
    console.error("Error saving invoice to DB:", err.message);
  }
});

/* ----------------------------------
   🌱 INIT DB ON START
---------------------------------- */
await initDb();

/* ----------------------------------
   🚀 EXPORT FOR VERCEL
---------------------------------- */
export default expressApp; // Serverless ready
