const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");

setGlobalOptions({ region: "asia-southeast1" });

const DISCORD_WEBHOOK_URL =
  "https://discord.com/api/webhooks/1509657052916744393/6uubXUv-xTTLBscuLfJAEs4FuaW6UYbhDjIDcqA9_Biweym2j6PGsbcun5tZ_DoSl1FP";

// Isi token bot Discord & ID channel #testi-done agar testimoni bisa dibaca.
const DISCORD_BOT_TOKEN = "";
const DISCORD_TESTI_CHANNEL_ID = "";

function parseTestimonialMessage(message) {
  const embed = message.embeds?.[0];
  const imageAttachment = message.attachments?.find((file) =>
    file.content_type?.startsWith("image/"),
  );

  const image =
    embed?.image?.url ||
    embed?.thumbnail?.url ||
    imageAttachment?.url ||
    null;

  let author =
    embed?.author?.name ||
    embed?.title ||
    message.author?.global_name ||
    message.author?.username ||
    "Customer";

  let content = (embed?.description || message.content || "").trim();
  let robux = "";

  if (embed?.fields?.length) {
    const robuxField = embed.fields.find((field) =>
      /robux/i.test(field.name || ""),
    );

    if (robuxField) {
      robux = String(robuxField.value || "").replace(/[^\d]/g, "");
    }

    if (!content) {
      content = embed.fields
        .map((field) => `${field.name}: ${field.value}`)
        .join(" • ");
    }
  }

  if (!robux) {
    const robuxMatch = content.match(/(\d[\d.,]*)\s*robux/i);
    if (robuxMatch) robux = robuxMatch[1].replace(/[^\d]/g, "");
  }

  return {
    id: message.id,
    author,
    content,
    robux,
    image,
    timestamp: message.timestamp,
  };
}

exports.getTestimonials = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!DISCORD_BOT_TOKEN || !DISCORD_TESTI_CHANNEL_ID) {
    res.status(503).json({
      error: "Discord bot belum dikonfigurasi",
      testimonials: [],
    });
    return;
  }

  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 50);

    const discordRes = await fetch(
      `https://discord.com/api/v10/channels/${DISCORD_TESTI_CHANNEL_ID}/messages?limit=${limit}`,
      {
        headers: {
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        },
      },
    );

    if (!discordRes.ok) {
      const errorText = await discordRes.text();
      console.error("Discord testimonials error:", discordRes.status, errorText);
      res.status(discordRes.status).json({ error: errorText, testimonials: [] });
      return;
    }

    const messages = await discordRes.json();

    const testimonials = messages
      .map(parseTestimonialMessage)
      .filter((item) => item.content || item.image || item.robux);

    res.json({ testimonials });
  } catch (error) {
    console.error("getTestimonials error:", error);
    res.status(500).json({ error: error.message, testimonials: [] });
  }
});

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
