const webhookUrl = "https://discord.com/api/webhooks/1509657052916744393/6uubXUv-xTTLBscuLfJAEs4FuaW6UYbhDjIDcqA9_Biweym2j6PGsbcun5tZ_DoSl1FP";

function escapeDiscordText(value) {
  if (value === null || value === undefined) return "-";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "<")
    .replace(/>/g, ">");
}

export async function sendDiscordWebhook(payload = {}) {
  try {
    if (!webhookUrl) return;

    const body = {
      content: payload.content ? escapeDiscordText(payload.content) : undefined,
      embeds: payload.embeds,
    };

    // Remove undefined fields to keep Discord happy
    if (body.content === undefined) delete body.content;
    if (!body.embeds) delete body.embeds;

    await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error("Discord webhook error:", e);
  }
}

export function buildOrderEmbed({ title, color = 0x5865f2, fields = [], footer = "VinzShop" }) {
  return {
    title,
    color,
    fields: fields.map((f) => ({
      name: escapeDiscordText(f.name),
      value: escapeDiscordText(f.value),
      inline: Boolean(f.inline),
    })),
    footer: { text: escapeDiscordText(footer) },
    timestamp: new Date().toISOString(),
  };
}

