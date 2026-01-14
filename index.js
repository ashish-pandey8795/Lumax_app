require("dotenv").config();
import express from "express";
const { App, ExpressReceiver } = require("@slack/bolt");

/* -------------------------------------------------------
   :brain: IN-MEMORY INSTALLATION STORE (DEMO ONLY)
------------------------------------------------------- */
const installationStore = {
  storeInstallation: async (installation) => {
    global.__INSTALLS__ = global.__INSTALLS__ || {};

    const key = installation.isEnterpriseInstall
      ? `enterprise:${installation.enterprise.id}`
      : `team:${installation.team.id}`;

    global.__INSTALLS__[key] = installation;
  },

  fetchInstallation: async ({ teamId, enterpriseId, isEnterpriseInstall }) => {
    const key = isEnterpriseInstall
      ? `enterprise:${enterpriseId}`
      : `team:${teamId}`;

    const installation = global.__INSTALLS__?.[key];
    if (!installation) throw new Error("No installation found");

    return installation;
  },
};

/* -------------------------------------------------------
   :electric_plug: EXPRESS RECEIVER (OAUTH ENABLED)
------------------------------------------------------- */
const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,

  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  stateSecret: process.env.SLACK_STATE_SECRET || "secret",

  scopes: ["chat:write"],

  installerOptions: {
    installPath: "/slack/install",
    redirectUriPath: "/slack/oauth_redirect",
    stateVerification: false, // OK for admin / Grid installs
  },

  installationStore,
});

/* -------------------------------------------------------
   :zap: SLACK APP (NO authorize HERE)
------------------------------------------------------- */
const app = new App({
  receiver,
  processBeforeResponse: true,
});

/* -------------------------------------------------------
   :globe_with_meridians: ROOT ROUTE
------------------------------------------------------- */
receiver.router.get("/", (_, res) => {
  res.send(`
    <h2>:white_check_mark: Slack OAuth Demo Running</h2>
    <a href="/slack/install">Install App</a>
  `);
});

/* -------------------------------------------------------
   :house: APP HOME
------------------------------------------------------- */
app.event("app_home_opened", async ({ event, client }) => {
  await client.views.publish({
    user_id: event.user,
    view: {
      type: "home",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*Demo App* :wave:\nClick below to open the form.",
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              action_id: "open_form",
              text: { type: "plain_text", text: "Open Form" },
              style: "primary",
            },
          ],
        },
      ],
    },
  });
});

/* -------------------------------------------------------
   :bricks: OPEN MODAL
------------------------------------------------------- */
app.action("open_form", async ({ ack, body, client }) => {
  await ack();

  await client.views.open({
    trigger_id: body.trigger_id,
    view: {
      type: "modal",
      callback_id: "submit_form",
      title: { type: "plain_text", text: "Demo Form" },
      submit: { type: "plain_text", text: "Submit" },
      close: { type: "plain_text", text: "Cancel" },
      blocks: [
        {
          type: "input",
          block_id: "name_block",
          label: { type: "plain_text", text: "Your Name" },
          element: {
            type: "plain_text_input",
            action_id: "name_input",
          },
        },
      ],
    },
  });
});

/* -------------------------------------------------------
   :white_check_mark: SUBMIT → SUCCESS DM
------------------------------------------------------- */
app.view("submit_form", async ({ ack, body, view, client }) => {
  await ack();

  const name = view.state.values.name_block.name_input.value;

  await client.chat.postMessage({
    channel: body.user.id,
    text: `:white_check_mark: Submitted successfully!\nHello *${name}* :wave:`,
  });
});

/* -------------------------------------------------------
   :rocket: START SERVER
------------------------------------------------------- */
(async () => {
  const PORT = process.env.PORT || 3000;
  await app.start(PORT);
  console.log(`:zap: Demo Slack App running on http://localhost:${PORT}`);
})();