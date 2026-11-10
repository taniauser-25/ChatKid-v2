// ChatKid server for boisestate.ai (Boise State University's AI service).
// It keeps the boisestate.ai API key secret: the key lives here as a Cloudflare secret,
// never in app.js or on the website.
//
// Setup (Cloudflare Workers, free tier):
//   1. dash.cloudflare.com → Workers & Pages → Create → Create Worker → name it (e.g. chatkid-proxy) → Deploy.
//   2. Edit code → replace everything with this file → Deploy.
//   3. Settings → Variables and Secrets → Add → type "Secret", name BOISESTATE_AI_KEY,
//      value = your key from boisestate.ai (Settings → API Keys) → Save.
//   4. (Optional) Add a plain variable MODEL_ID to change the model, e.g. us.amazon.nova-pro-v1:0
//   5. Put this Worker's URL in CONFIG.proxy.url in app.js.
//
// Notes:
//   - boisestate.ai keys expire every 90 days. When ChatKid says its key expired,
//     create a new key on boisestate.ai and replace the BOISESTATE_AI_KEY secret here.
//   - Usage counts toward your monthly boisestate.ai quota.
//   - Messages are sent to boisestate.ai (hosted by Boise State); nothing is stored by this Worker.

const ALLOWED_ORIGIN = "https://taniauser-25.github.io";
const API_URL = "https://api.boisestate.ai/chat/api-converse";
const DEFAULT_MODEL = "us.amazon.nova-lite-v1:0"; // fastest; nova-pro is more capable

function cors(extra = {}) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
    ...extra,
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: cors({ "Content-Type": "application/json" }),
  });
}

// Turn ChatKid's messages into what boisestate.ai expects:
// a separate systemPrompt, and user/assistant turns that start with a user turn and alternate.
export function toBoiseStateRequest(messages, { modelId, maxTokens, temperature }) {
  const list = Array.isArray(messages) ? messages : [];
  const systemPrompt = list
    .filter((m) => m && m.role === "system")
    .map((m) => String(m.content || ""))
    .join("\n\n");

  const turns = [];
  for (const m of list) {
    if (!m || (m.role !== "user" && m.role !== "assistant")) continue;
    const content = String(m.content || "").trim();
    if (!content) continue;
    const last = turns[turns.length - 1];
    if (last && last.role === m.role) {
      last.content += "\n\n" + content; // merge back-to-back turns from the same side
    } else {
      turns.push({ role: m.role, content });
    }
  }
  while (turns.length && turns[0].role !== "user") turns.shift(); // drop the welcome message

  return {
    messages: turns,
    modelId,
    systemPrompt,
    maxTokens: Math.min(Math.max(Number(maxTokens) || 200, 16), 600),
    temperature: typeof temperature === "number" ? temperature : 0.6,
  };
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: cors() });
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    if (!env.BOISESTATE_AI_KEY) return json({ error: "missing_key" }, 500);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "bad_request" }, 400);
    }

    const payload = toBoiseStateRequest(body.messages, {
      modelId: env.MODEL_ID || DEFAULT_MODEL,
      maxTokens: body.max_tokens,
      temperature: body.temperature,
    });
    if (!payload.messages.length) return json({ error: "no_question" }, 400);

    let apiResponse;
    try {
      apiResponse = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": env.BOISESTATE_AI_KEY },
        body: JSON.stringify(payload),
      });
    } catch {
      return json({ error: "unreachable" }, 502);
    }

    if (!apiResponse.ok) {
      // 401 = key expired or wrong, 403 = monthly quota used up, 429 = too many requests
      const reason =
        apiResponse.status === 401 ? "key_expired" :
        apiResponse.status === 403 ? "quota_exceeded" :
        apiResponse.status === 429 ? "rate_limited" : "upstream_error";
      return json({ error: reason, status: apiResponse.status }, 502);
    }

    const data = await apiResponse.json().catch(() => ({}));
    const reply = typeof data.text === "string" ? data.text : "";
    return json({ reply });
  },
};
