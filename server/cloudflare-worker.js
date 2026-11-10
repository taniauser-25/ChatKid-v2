// Optional: a tiny server for CONFIG.provider = "proxy".
// Use this only if the in-browser model (webllm) is too slow on your session laptops.
// It keeps your API key secret (never put an API key in app.js on a public website).
//
// Setup (Cloudflare Workers, free tier):
//   1. Create a Worker at dash.cloudflare.com and paste this file in.
//   2. Settings → Variables → add a secret named ANTHROPIC_API_KEY.
//   3. Set ALLOWED_ORIGIN below to your website (e.g. "https://your-name.github.io").
//   4. Put the Worker URL in CONFIG.proxy.url in app.js and open ChatKid with ?provider=proxy.
//
// Note for the IRB: with this option, children's messages are sent to the model provider.

const ALLOWED_ORIGIN = "https://your-name.github.io";
const MODEL = "claude-haiku-5-5";

function cors(extra = {}) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    ...extra,
  };
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: cors() });
    if (request.method !== "POST") return new Response("Not allowed", { status: 405, headers: cors() });

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response("Bad request", { status: 400, headers: cors() });
    }

    const messages = Array.isArray(body.messages) ? body.messages : [];
    const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
    let chat = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: String(m.content || "") }));
    // The API expects the conversation to start with a user turn.
    while (chat.length && chat[0].role !== "user") chat.shift();

    const apiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: Math.min(Number(body.max_tokens) || 300, 600),
        system,
        messages: chat,
      }),
    });

    if (!apiResponse.ok) {
      return new Response(JSON.stringify({ error: apiResponse.status }), {
        status: 502,
        headers: cors({ "Content-Type": "application/json" }),
      });
    }

    const data = await apiResponse.json();
    const reply = (data.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
    return new Response(JSON.stringify({ reply }), { headers: cors({ "Content-Type": "application/json" }) });
  },
};
