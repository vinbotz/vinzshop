const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");

setGlobalOptions({ region: "asia-southeast1" });

const DISCORD_WEBHOOK_URL =
  "https://discord.com/api/webhooks/1509657052916744393/6uubXUv-xTTLBscuLfJAEs4FuaW6UYbhDjIDcqA9_Biweym2j6PGsbcun5tZ_DoSl1FP";

exports.sendDiscordWebhook = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const payload = req.body || {};
    const body = {};

    if (payload.content) body.content = String(payload.content);
    if (payload.embeds) body.embeds = payload.embeds;

    const discordRes = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!discordRes.ok) {
      const errorText = await discordRes.text();
      console.error("Discord API error:", discordRes.status, errorText);
      res.status(discordRes.status).json({ error: errorText });
      return;
    }

    res.status(204).send("");
  } catch (error) {
    console.error("sendDiscordWebhook error:", error);
    res.status(500).json({ error: error.message });
  }
});
