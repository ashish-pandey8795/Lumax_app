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




require("dotenv").config();
const { App, ExpressReceiver } = require("@slack/bolt");
const express = require("express");
const fs = require("fs");
const path = require("path");
const https = require("https");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const { initDb, pool } = require("./utils/db");
const lemontreeRoutes = require("./routes/lemontreeRoutes");
const taskRoutes = require("./routes/taskRoutes");
const cron = require("node-cron");
const fetch = require("node-fetch");
const { WebClient } = require("@slack/web-api");

// ------------------------
// Slack Express Receiver
// ------------------------
const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  stateSecret: process.env.SESSION_SECRET || "secret",
  installerOptions: {
    redirectUriPath: "/slack/oauth_redirect",
    stateVerification: false,
  },
  scopes: ["commands", "chat:write", "users:read"],
  installationStore: {
    storeInstallation: async (installation) => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS slack_installations (
          id SERIAL PRIMARY KEY,
          team_id TEXT,
          enterprise_id TEXT,
          team_name TEXT,
          bot_token TEXT,
          bot_user_id TEXT,
          installed_by TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);

      await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS slack_install_workspace_idx
        ON slack_installations (team_id) WHERE team_id IS NOT NULL;
      `);

      await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS slack_install_enterprise_idx
        ON slack_installations (enterprise_id) WHERE enterprise_id IS NOT NULL;
      `);

      const teamId = installation.team?.id || null;
      const entId = installation.enterprise?.id || null;
      const conflictField = teamId ? "team_id" : "enterprise_id";

      await pool.query(
        `
        INSERT INTO slack_installations
          (team_id, enterprise_id, team_name, bot_token, bot_user_id, installed_by)
        VALUES ($1,$2,$3,$4,$5,$6)
        ON CONFLICT (${conflictField})
        DO UPDATE SET
          team_name = EXCLUDED.team_name,
          bot_token = EXCLUDED.bot_token,
          bot_user_id = EXCLUDED.bot_user_id,
          installed_by = EXCLUDED.installed_by
      `,
        [
          teamId,
          entId,
          installation.team?.name || null,
          installation.bot?.token,
          installation.bot?.userId,
          installation.user?.id,
        ]
      );

      console.log("[install] stored installation", JSON.stringify({ teamId, entId }));
    },

    fetchInstallation: async (query) => {
      const { teamId, enterpriseId } = query;
      let sql, value;
      if (teamId) {
        sql = `SELECT * FROM slack_installations WHERE team_id = $1 LIMIT 1`;
        value = teamId;
      } else if (enterpriseId) {
        sql = `SELECT * FROM slack_installations WHERE enterprise_id = $1 LIMIT 1`;
        value = enterpriseId;
      }

      if (sql) {
        const res = await pool.query(sql, [value]);
        if (res.rows.length) {
          const row = res.rows[0];
          return {
            team: row.team_id ? { id: row.team_id, name: row.team_name } : undefined,
            enterprise: row.enterprise_id ? { id: row.enterprise_id } : undefined,
            bot: { token: row.bot_token, userId: row.bot_user_id },
          };
        }
      }

      const fallback = await pool.query(
        "SELECT * FROM slack_installations ORDER BY created_at DESC LIMIT 1"
      );
      if (fallback.rows.length) {
        const row = fallback.rows[0];
        console.warn("[install] fallback to latest row for installation", JSON.stringify({ teamId, enterpriseId }));
        return {
          team: row.team_id ? { id: row.team_id, name: row.team_name } : undefined,
          enterprise: row.enterprise_id ? { id: row.enterprise_id } : undefined,
          bot: { token: row.bot_token, userId: row.bot_user_id },
        };
      }

      if (process.env.SLACK_BOT_TOKEN) {
        console.warn("[install] fallback to SLACK_BOT_TOKEN env for installation");
        return { bot: { token: process.env.SLACK_BOT_TOKEN, userId: process.env.SLACK_BOT_USER_ID } };
      }

      throw new Error("No installation found");
    },
  },
});

// ------------------------
// Utils
// ------------------------
function formatDateTime(dateStr) {
  return new Date(dateStr).toLocaleString("en-GB", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function taskMessageBlock(task, title = "Task") {
  const due = formatDateTime(task.due_date);
  const created = formatDateTime(task.created_at);
  const updated = formatDateTime(task.updated_at);

  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          `*${title}*\n` +
          `*Task ID:* ${task.task_id}\n` +
          `*Task Name:* ${task.task_name}\n` +
          `*Due Date:* ${due}\n` +
          `*Assigned To:* ${task.assign_user_name}\n` +
          `*level:* ${task.user_level}\n` +
          `*Status:* ${task.status}\n` +
          `*Created At:* ${created}\n` +
          `*Updated At:* ${updated}`,
      },
    },
  ];
}

// ------------------------
// App
// ------------------------
const app = new App({ receiver, processBeforeResponse: true });

// ------------------------
// Home Page
// ------------------------
app.event("app_home_opened", async ({ event, client }) => {
  try {
    const res = await fetch("https://oberio-customer-demo-1220bc1f6242.herokuapp.com/api/task/tasks");
    const json = await res.json();
    const tasks = json.data || [];

    const pendingCount = tasks.filter((t) => t.status === "pending").length;
    const completedCount = tasks.filter((t) => t.status === "completed").length;

    await client.views.publish({
      user_id: event.user,
      view: {
        type: "home",
        callback_id: "home_dashboard",
        blocks: [
          { type: "section", text: { type: "mrkdwn", text: "*LemonTree Hotels — Task Dashboard*" } },
          { type: "divider" },
          {
            type: "actions",
            elements: [
              { type: "button", text: { type: "plain_text", text: "Create Task" }, style: "primary", action_id: "open_create_task" },
            ],
          },
          { type: "divider" },
          {
            type: "actions",
            elements: [
              { type: "button", text: { type: "plain_text", text: `All Tasks (${tasks.length})` }, action_id: "filter_all_tasks" },
              { type: "button", text: { type: "plain_text", text: `Pending (${pendingCount})` }, action_id: "filter_pending_tasks" },
              { type: "button", text: { type: "plain_text", text: `Completed (${completedCount})` }, action_id: "filter_completed_tasks" },
            ],
          },
          { type: "divider" },
          { type: "context", elements: [{ type: "mrkdwn", text: "LemonTree Hotels © 2025 | Powered by Lemontree Guest Management" }] },
        ],
      },
    });
  } catch (e) {
    console.error("App Home Error:", e);
  }
});

// ------------------------
// Modals
// ------------------------
app.action("open_create_task", async ({ ack, body, client }) => {
  await ack();
  await client.views.open({
    trigger_id: body.trigger_id,
    view: {
      type: "modal",
      callback_id: "create_task_submit",
      title: { type: "plain_text", text: "Create Task" },
      submit: { type: "plain_text", text: "Create" },
      close: { type: "plain_text", text: "Cancel" },
      blocks: [
        { type: "input", block_id: "task_name_block", label: { type: "plain_text", text: "Task Name" }, element: { type: "plain_text_input", action_id: "task_name" } },
        { type: "input", block_id: "due_date_block", label: { type: "plain_text", text: "Due Date & Time" }, element: { type: "datetimepicker", action_id: "due_date" } },
      ],
    },
  });
});

// ------------------------
// Task CRUD
// ------------------------
async function fetchAllTasks() {
  const res = await fetch("https://oberio-customer-demo-1220bc1f6242.herokuapp.com/api/task/tasks");
  const json = await res.json();
  return json.data || [];
}

async function openTaskListModalReadonly(client, trigger_id, tasks, title) {
  const blocks = [];
  tasks.forEach((task) => {
    blocks.push(...taskMessageBlock(task));
    blocks.push({ type: "divider" });
  });

  await client.views.open({
    trigger_id,
    view: { type: "modal", callback_id: "task_list_modal_readonly", title: { type: "plain_text", text: title }, close: { type: "plain_text", text: "Close" }, blocks },
  });
}

// Filter buttons
app.action("filter_all_tasks", async ({ ack, body, client }) => { await ack(); await openTaskListModalReadonly(client, body.trigger_id, await fetchAllTasks(), "All Tasks"); });
app.action("filter_pending_tasks", async ({ ack, body, client }) => { await ack(); const tasks = (await fetchAllTasks()).filter(t => t.status === "pending"); await openTaskListModalReadonly(client, body.trigger_id, tasks, "Pending Tasks"); });
app.action("filter_completed_tasks", async ({ ack, body, client }) => { await ack(); const tasks = (await fetchAllTasks()).filter(t => t.status === "completed"); await openTaskListModalReadonly(client, body.trigger_id, tasks, "Completed Tasks"); });

// Task create view
app.view("create_task_submit", async ({ ack, body, view, client }) => {
  await ack();
  try {
    const userId = body.user.id;
    const task_name = view.state.values.task_name_block.task_name.value;
    const due_date = view.state.values.due_date_block.due_date.selected_date_time;
    if (!task_name || !due_date) throw new Error("Task name & due date are required");

    const postData = { task_name, due_date: new Date(due_date * 1000).toISOString() };
    const res = await fetch("https://oberio-customer-demo-1220bc1f6242.herokuapp.com/api/task/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(postData) });
    const result = await res.json();
    if (!res.ok || result.success === false) throw new Error(result.error || "Task API failed");

    const task = result.data;
    const msgBlock = taskMessageBlock(task, "Task Created");

    // Confirmation to creator
    await client.chat.postMessage({ channel: userId, text: "✅ Task Created", blocks: msgBlock });

    // Send to assigned user
    if (task.user_channel_id) {
      await client.chat.postMessage({
        channel: task.user_channel_id,
        text: "New Task Assigned",
        blocks: [...msgBlock, { type: "actions", elements: [
          { type: "button", text: { type: "plain_text", text: "Escalate" }, action_id: "resign_task", value: String(task.task_id) },
          { type: "button", text: { type: "plain_text", text: "Complete" }, style: "primary", action_id: "complete_task", value: String(task.task_id) }
        ]}],
      });
    }
  } catch (err) {
    console.error("Task create error:", err);
    await client.chat.postMessage({ channel: body.user.id, text: `❌ ${err.message}` });
  }
});

// ------------------------
// Resign & Complete
// ------------------------
app.action("resign_task", async ({ ack, body, client }) => {
  await ack();
  try {
    const taskId = body.actions[0].value;
    const resignRes = await fetch(`https://oberio-customer-demo-1220bc1f6242.herokuapp.com/api/task/tasks/${taskId}/resign`, { method: "PUT" });
    if (!resignRes.ok) throw new Error("Failed to reassign task");

    const taskRes = await fetch(`https://oberio-customer-demo-1220bc1f6242.herokuapp.com/api/task/tasks/${taskId}`);
    if (!taskRes.ok) throw new Error("Failed to fetch task");
    const task = (await taskRes.json()).data;
    if (!task || !task.user_channel_id) throw new Error("Task or user channel not found");

    await client.chat.postMessage({
      channel: task.user_channel_id,
      text: "Task Reassigned",
      blocks: [...taskMessageBlock(task, "Task Reassigned"), { type: "actions", elements: [
        { type: "button", text: { type: "plain_text", text: "Escalate" }, action_id: "resign_task", value: String(task.task_id) },
        { type: "button", text: { type: "plain_text", text: "Complete" }, style: "primary", action_id: "complete_task", value: String(task.task_id) }
      ]}],
    });

    await client.chat.postMessage({ channel: body.user.id, text: "Task reassigned successfully" });
  } catch (err) {
    console.error("RESIGN TASK ERROR:", err);
    await client.chat.postMessage({ channel: body.user.id, text: `❌ ${err.message}` });
  }
});

app.action("complete_task", async ({ ack, body, client }) => {
  await ack();
  const taskId = body.actions[0].value;
  await fetch(`https://oberio-customer-demo-1220bc1f6242.herokuapp.com/api/task/tasks/${taskId}/complete`, { method: "PUT" });
  await client.chat.postMessage({ channel: body.user.id, text: "✅ Task marked as completed" });
});

// ------------------------
// Slash Command
// ------------------------
app.command("/task", async ({ ack, body, client }) => {
  await ack();
  await client.views.open({
    trigger_id: body.trigger_id,
    view: {
      type: "modal",
      callback_id: "create_task_submit",
      title: { type: "plain_text", text: "Create Task" },
      submit: { type: "plain_text", text: "Create" },
      close: { type: "plain_text", text: "Cancel" },
      blocks: [
        { type: "input", block_id: "task_name_block", label: { type: "plain_text", text: "Task Name" }, element: { type: "plain_text_input", action_id: "task_name", placeholder: { type: "plain_text", text: "Enter task name" } } },
        { type: "input", block_id: "due_date_block", label: { type: "plain_text", text: "Due Date & Time" }, element: { type: "datetimepicker", action_id: "due_date" } },
      ],
    },
  });
});

// ------------------------
// Receiver routes
// ------------------------
receiver.router.use(require("body-parser").json());
receiver.router.use("/api/lemontree", lemontreeRoutes);
receiver.router.use("/api/task", taskRoutes);

receiver.router.get("/", (_, res) => res.send("✅ Customer 360 Slack App running"));

// ------------------------
// Auto-Resign Scheduler
// ------------------------
const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);

async function autoResignTasks() {
  try {
    const tasks = await fetchAllTasks();
    const now = new Date();
    for (const task of tasks) {
      if (task.status !== "pending") continue;
      const dueDate = new Date(task.due_date);
      if (dueDate <= now) {
        // Resign
        await fetch(`https://oberio-customer-demo-1220bc1f6242.herokuapp.com/api/task/tasks/${task.task_id}/resign`, { method: "PUT" });
        const updatedTask = (await (await fetch(`https://oberio-customer-demo-1220bc1f6242.herokuapp.com/api/task/tasks/${task.task_id}`)).json()).data;
        if (updatedTask.user_channel_id) {
          await slackClient.chat.postMessage({
            channel: updatedTask.user_channel_id,
            text: "📌 New Task Assigned",
            blocks: [...taskMessageBlock(updatedTask, "New Task Assigned"), {
              type: "actions", elements: [
                { type: "button", text: { type: "plain_text", text: "Escalate" }, action_id: "resign_task", value: String(updatedTask.task_id) },
                { type: "button", text: { type: "plain_text", text: "Complete" }, style: "primary", action_id: "complete_task", value: String(updatedTask.task_id) }
              ]
            }],
          });
        }
      }
    }
  } catch (err) {
    console.error("Auto-resign scheduler error:", err);
  }
}

// Schedule every 30 minutes
cron.schedule("*/30 * * * *", autoResignTasks);

// ------------------------
// Start app
// ------------------------
(async () => {
  await initDb();
  const PORT = process.env.PORT || 3000;
  await app.start(PORT);
  console.log(`⚡ Slack + Salesforce Customer 360 running on port ${PORT}`);
})();
