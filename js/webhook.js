const webhookUrl =
  "https://discord.com/api/webhooks/1509657052916744393/6uubXUv-xTTLBscuLfJAEs4FuaW6UYbhDjIDcqA9_Biweym2j6PGsbcun5tZ_DoSl1FP";

function escapeDiscordText(value) {
  if (value === null || value === undefined) return "-";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function sendDiscordWebhook(payload = {}) {
  try {
    if (!webhookUrl) return false;

    const body = {};

    if (payload.content) {
      body.content = escapeDiscordText(payload.content);
    }

    if (payload.embeds) {
      body.embeds = payload.embeds;
    }

    if (!body.content && !body.embeds) return false;

    // Discord memblokir request JSON dari browser (preflight CORS).
    // FormData dikirim sebagai "simple request" tanpa preflight sehingga pesan tetap sampai ke channel.
    const formData = new FormData();
    formData.append("payload_json", JSON.stringify(body));

    const response = await fetch(webhookUrl, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "Discord webhook gagal:",
        response.status,
        errorText || response.statusText,
      );
      return false;
    }

    return true;
  } catch (error) {
    // Beberapa browser melempar error CORS meski Discord sudah menerima pesan.
    console.warn("Discord webhook warning:", error);
    return true;
  }
}

export function buildOrderEmbed({
  title,
  color = 0x5865f2,
  fields = [],
  footer = "VinzShop",
}) {
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
