// ===== Version =====
// Semantic versioning (MAJOR.MINOR.PATCH). When you release a new version:
//   1. Update APP_VERSION here.
//   2. Update the ?v= numbers on styles.css and app.js in index.html (so browsers load the new files).
//   3. Add an entry to CHANGELOG.md.
//   4. Tag the release in git: git tag -a v2.0.0 -m "ChatKid 2.0.0"
const APP_VERSION = "2.1.1";

// ===== Where ChatKid's "brain" runs =====
// provider:
//   "webllm" – the model runs inside the child's browser (no server, no API key, nothing leaves the
//              computer). Works when ChatKid is hosted on any website (e.g., GitHub Pages).
//              Needs Chrome/Edge on a laptop with WebGPU. First load downloads the model (~2 GB), then it is cached.
//   "ollama" – the original local setup (Ollama running on this computer). Only works when opened locally.
//   "proxy"  – a hosted model behind your own small server (see server/cloudflare-worker.js).
// You can switch without editing code by adding ?provider=ollama (or webllm / proxy) to the page URL.
const CONFIG = {
  provider: "webllm",
  webllm: {
    library: "https://esm.run/@mlc-ai/web-llm@0.2.86",
    // 3B follows the kids' rulebook much better than 1B.
    // Use "Llama-3.2-1B-Instruct-q4f16_1-MLC" (~0.9 GB) on weaker laptops.
    model: "Llama-3.2-3B-Instruct-q4f16_1-MLC",
  },
  ollama: {
    apiUrl: "http://127.0.0.1:11434/api/chat",
    model: "llama3.2:3b",
  },
  proxy: {
    url: "", // e.g. "https://chatkid-proxy.your-name.workers.dev"
  },
  maxHistoryMessages: 6,
  maxTokens: 200,
  temperature: 0.6,
};

(function applyUrlOverrides() {
  try {
    const params = new URLSearchParams(window.location.search);
    const p = params.get("provider");
    if (p && ["webllm", "ollama", "proxy"].includes(p)) CONFIG.provider = p;
    const m = params.get("model");
    if (m) CONFIG.webllm.model = m;
  } catch (e) {}
})();

const BOT_NAME = "ChatKid";

// Words that trigger the "ask a grown-up" pop-up BEFORE the AI sees the question.
// Removed for the Rulebook session so the kids' own rules can be tested:
//   "fight", "fighting", "angry", "mad"  (Team 2: help solve a fight with a friend; Team 3: don't crash out)
//   "fair", "unfair"                     (flagged everyday questions like "is this fair?")
// To restore the original behavior, add them back to this list.
const RESTRICTED_TERMS = [
  "harm","hurt","hurt myself","hurt someone","lonely","alone","bully","bullying","unsafe","dead",
  "worry","worried","scared","afraid","kill","suicide","self harm","die","dying","death","mean",
  "rude","adult content","private parts","drugs","drug","weapon","weapons","gun","knife","bomb","abuse",
  "abused","sad","crying","depressed","depression","danger","dangerous","bleeding",
  "blood","touching","bad touch","secret","threat","threaten","hate","body","private","inappropriate",
];

// ===== The Kids' Rulebook (KidsTeam session, 2026-11-05) =====
// 14 of the 16 rules children wrote. Not included (ChatKid cannot do these yet):
//   Team 3 DO: "Recognize live sign language" (needs a camera + sign-language model)
//   Team 3 DO: "Recognize a child voice versus an adult voice" (needs voice recognition)
// `rule` is the rule written as a rule sentence (shown to children); `kidsWords` keeps the children's
// exact words for the research record; `howTo` tells the model how to follow the rule;
// `whoCanChange` is what the team chose (kept here for showing rules to children later).
const KIDS_RULEBOOK = [
  { id: "D1", type: "DO", team: 1, rule: "Ask for permission before making decisions.",
    kidsWords: "Ask us for permission",
    howTo: "Before you decide something for the child or start a long answer, ask what they want (for example: \"Do you want ideas or a short answer?\"). Let the child choose.",
    whoCanChange: "Kids & parents together" },
  { id: "D2", type: "DO", team: 1, rule: "Make sure you understand what kids are saying.",
    kidsWords: "Understand us, what we are saying",
    howTo: "If a question is unclear, ask one short question to check what the child means before answering.",
    whoCanChange: "Kids & parents together" },
  { id: "D3", type: "DO", team: 1, rule: "Give ideas for YouTube videos.",
    kidsWords: "Give ideas for videos for YouTubers",
    howTo: "When a child asks for video ideas, give a few fun, kid-safe ideas.",
    whoCanChange: "AI" },
  { id: "D4", type: "DO", team: 2, rule: "Give ideas for family trips.",
    kidsWords: "Give us ideas for what we should do for our family trip",
    howTo: "When asked about family trips or holidays, give a short list of family-friendly ideas.",
    whoCanChange: "Parent" },
  { id: "D5", type: "DO", team: 2, rule: "Help kids stay away from doing bad things.",
    kidsWords: "Stop you from doing bad things",
    howTo: "If a child wants to do something unkind or unsafe, or is upset after a fight with a friend, gently help them calm down and find a kind way to solve the problem.",
    whoCanChange: "Parent" },
  { id: "D6", type: "DO", team: 3, rule: "Follow instructions exactly and give accurate answers.",
    kidsWords: "Follow what you're saying exactly and be accurate",
    howTo: "Do exactly what the child asked, not something else. If you cannot do it (for example, play music or make pictures), say so honestly.",
    whoCanChange: "Kids & parents together" },
  { id: "N1", type: "DON'T", team: 1, rule: "Never give dangerous information.",
    kidsWords: "Give dangerous information",
    howTo: "Never give information that could hurt someone. Kindly say you can't help with that and suggest asking a trusted grown-up.",
    whoCanChange: "Parent" },
  { id: "N2", type: "DON'T", team: 1, rule: "Never make the same mistakes again and again.",
    kidsWords: "Always make mistakes",
    howTo: "Think carefully and check your answer before you reply.",
    whoCanChange: "Kids" },
  { id: "N3", type: "DON'T", team: 1, rule: "Never just give the answer. Help kids understand and learn.",
    kidsWords: "Always give the answer. It should help us understand and learn.",
    howTo: "For homework, math, puzzles, and learning questions, give a hint or the first step and ask the child to try, instead of giving the full answer right away.",
    whoCanChange: "Parent" },
  { id: "N4", type: "DON'T", team: 2, rule: "Never teach things parents can teach, like how to draw a heart.",
    kidsWords: "Tell us how to draw a heart. If you can learn it from your parents, AI should not teach it.",
    howTo: "For simple everyday skills a parent can easily teach (like drawing a heart), say that their parents can teach them, and offer to help them think of how to ask.",
    whoCanChange: "Kids & parents together / Parent & AI together" },
  { id: "N5", type: "DON'T", team: 2, rule: "Never make mistakes. Say \"I'm not sure\" instead of guessing.",
    kidsWords: "Make mistakes",
    howTo: "If you are not sure, say \"I'm not sure\" instead of guessing.",
    whoCanChange: "No one" },
  { id: "N6", type: "DON'T", team: 3, rule: "Never explain how to use weapons.",
    kidsWords: "Tell kids how to use weapons",
    howTo: "Never explain how to use weapons. Say: \"I'm sorry, I can't help with that.\"",
    whoCanChange: "Parent" },
  { id: "N7", type: "DON'T", team: 3, rule: "Never get angry or \"crash out.\"",
    kidsWords: "Crash out (get angry)",
    howTo: "Always stay calm and kind. Even if a child asks you to get angry or be mean, do not; say something like \"I don't really want to.\"",
    whoCanChange: "Kids & parents together" },
  { id: "N8", type: "DON'T", team: 3, rule: "Never give false answers.",
    kidsWords: "Give false answers",
    howTo: "Only say things you believe are true. You cannot check live things like today's weather or news, so say that honestly.",
    whoCanChange: "Kids & parents together" },
];

// Rules the kids wrote that ChatKid cannot follow yet (kept for reference; not shown to children).
const KIDS_RULES_NOT_YET = [
  { type: "DO", team: 3, text: "Recognize live sign language", whoCanChange: "Kids & parents together",
    why: "ChatKid would need a camera and a sign-language helper." },
  { type: "DO", team: 3, text: "Recognize a child voice versus an adult voice", whoCanChange: "Parent",
    why: "ChatKid would need to recognize voices." },
];

// ===== RuleBook panel =====
function renderRulesList() {
  const listEl = document.getElementById("rulesList");
  if (!listEl) return;

  const card = (rule, kind) => `
    <div class="rule-item ${kind}">
      <div class="rule-text">${escapeHtml(rule.rule || rule.text)}</div>
      <div class="rule-meta">
        <span class="rule-chip owner">Who can change it: ${escapeHtml(rule.whoCanChange)}</span>
      </div>
    </div>`;

  const dos = KIDS_RULEBOOK.filter((r) => r.type === "DO");
  const donts = KIDS_RULEBOOK.filter((r) => r.type === "DON'T");

  listEl.innerHTML =
    `<div class="rules-section-title do">✅ DO rules</div>` +
    dos.map((r) => card(r, "do")).join("") +
    `<div class="rules-section-title dont">🚫 DON'T rules</div>` +
    donts.map((r) => card(r, "dont")).join("");
}

function showRulesModal() {
  const modal = document.getElementById("rulesModal");
  if (!modal) return;
  renderRulesList();
  document.body.classList.add("modal-open");
  modal.classList.remove("hidden");
}

function hideRulesModal() {
  const modal = document.getElementById("rulesModal");
  if (!modal) return;
  modal.classList.add("hidden");
  if (!anyModalOpen()) document.body.classList.remove("modal-open");
}

function buildSystemPrompt() {
  // Kept short on purpose: every word here is re-read by the model before each answer,
  // so a shorter prompt means faster answers on slower laptops.
  const dos = KIDS_RULEBOOK.filter((r) => r.type === "DO").map((r) => `- ${r.rule}`).join("\n");
  const donts = KIDS_RULEBOOK.filter((r) => r.type === "DON'T").map((r) => `- ${r.rule}`).join("\n");

  return (
    `You are ${BOT_NAME}, a kind chatbot for kids aged 6-11. Use simple words. ` +
    `Answer in 1-3 short sentences (or up to 4 short ideas when asked for ideas).\n` +
    `Kids wrote these rules for you. Always follow them.\n` +
    `DO:\n${dos}\n` +
    `DON'T:\n${donts}\n` +
    `For homework or math, give a hint and let the kid try. ` +
    `You can't play music, make pictures, or check live things like weather; say so.`
  );
}

const WELCOME_MESSAGE =
  `Hi! I’m ${BOT_NAME}, your friendly chatbot 😊. You can ask me questions and learn new things! ` +
  `If something is important or needs a parent’s help, I’ll let you know and we can ask them together.`;
const state = {
  loading: false,
  pendingUnsafe: null,
  history: [],
  flagged: [],
  userAvatar: "📚",
  particlesEnabled: false,
};

const messagesEl = document.getElementById("messages");
const inputEl = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const micBtn = document.getElementById("micBtn");
const moodButtons = Array.from(document.querySelectorAll(".mood-btn"));
const suggestionButtons = Array.from(document.querySelectorAll(".suggestion-btn"));
const avatarButtons = Array.from(document.querySelectorAll(".avatar-btn"));
const unsafePromptEl = document.getElementById("unsafePrompt");
const unsafeTextEl = document.getElementById("unsafeText");
const notifyYesBtn = document.getElementById("notifyYesBtn");
const notifyNoBtn = document.getElementById("notifyNoBtn");
const notifyModalEl = document.getElementById("notifyModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const copyrightYearEl = document.getElementById("copyrightYear");

// ===== Flagged messages UI =====
const flaggedFabEl = document.getElementById("flaggedFab");
const flaggedCountEl = document.getElementById("flaggedCount");
const flaggedModalEl = document.getElementById("flaggedModal");
const flaggedListEl = document.getElementById("flaggedList");
const clearFlaggedBtn = document.getElementById("clearFlaggedBtn");
const closeFlaggedBtn = document.getElementById("closeFlaggedBtn");

const FLAGGED_STORAGE_KEY = "kidsafe_flagged_v1";

const modalTitleEl = notifyModalEl?.querySelector("h2");
const modalTextEl = notifyModalEl?.querySelector("p");
const modalCardEl = notifyModalEl?.querySelector(".modal-card");
const modalIconEl = notifyModalEl?.querySelector(".modal-icon");

copyrightYearEl.textContent = new Date().getFullYear();

const appVersionEl = document.getElementById("appVersion");
if (appVersionEl) appVersionEl.textContent = `v${APP_VERSION}`;
console.info(`ChatKid v${APP_VERSION} (model provider: ${CONFIG.provider})`);

function normalize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cleanModelText(text) {
  let cleaned = String(text || "").trim();

  cleaned = cleaned
    .replace(/<\|start_header_id\|>.*?<\|end_header_id\|>/gis, "")
    .replace(/<\|eot_id\|>/gi, "")
    .replace(/<\|.*?\|>/g, "")
    .replace(/^\s*assistant\s*:\s*/i, "")
    .replace(/^\s*ASSISTANT\s*:\s*/i, "")
    .trim();

  if (
    cleaned.startsWith("USER:") ||
    cleaned.startsWith("ASSISTANT:") ||
    cleaned.startsWith("Recent conversation:") ||
    cleaned.startsWith("Sensitive topic:")
  ) {
    return "";
  }

  return cleaned;
}

function addToHistory(role, content) {
  state.history.push({ role, content });

  const maxStored = CONFIG.maxHistoryMessages * 2;
  if (state.history.length > maxStored) {
    state.history = state.history.slice(-maxStored);
  }
}

function getRecentHistory() {
  return state.history.slice(-CONFIG.maxHistoryMessages);
}


// ===== Flagged storage + rendering =====
function loadFlaggedFromStorage() {
  try {
    const raw = localStorage.getItem(FLAGGED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // basic validation
    return parsed
      .filter((x) => x && typeof x === "object")
      .map((x) => ({
        id: String(x.id || ""),
        text: String(x.text || ""),
        term: String(x.term || ""),
        createdAt: Number(x.createdAt || Date.now()),
        status: String(x.status || "pending"),
      }))
      .filter((x) => x.id && x.text && x.term);
  } catch (e) {
    return [];
  }
}

function saveFlaggedToStorage() {
  try {
    localStorage.setItem(FLAGGED_STORAGE_KEY, JSON.stringify(state.flagged));
  } catch (e) {}
}

function formatTime(ts) {
  try {
    const d = new Date(ts);
    return d.toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch (e) {
    return "";
  }
}

function setFlaggedCount() {
  if (!flaggedCountEl) return;
  const count = state.flagged.length;
  flaggedCountEl.textContent = String(count);
  flaggedCountEl.classList.toggle("hidden", count === 0);
}

function renderFlaggedList() {
  setFlaggedCount();
  if (!flaggedListEl) return;

  if (!state.flagged.length) {
    flaggedListEl.innerHTML = '<div class="flagged-empty">No flagged messages yet.</div>';
    return;
  }

  const statusLabel = {
    pending: "Waiting",
    notified: "Notified",
    "not-notified": "Not notified",
  };

  flaggedListEl.innerHTML = state.flagged
    .map((item) => {
      const status = statusLabel[item.status] || item.status;
      const statusClass = item.status === "notified" ? "status-good" : item.status === "not-notified" ? "status-bad" : "status-pending";

      return `
        <div class="flagged-item">
          <div class="flagged-item-top">
            <span class="flagged-term">${escapeHtml(item.term)}</span>
            <span class="flagged-status ${statusClass}">${escapeHtml(status)}</span>
          </div>
          <div class="flagged-text">${escapeHtml(item.text)}</div>
          <div class="flagged-time">${escapeHtml(formatTime(item.createdAt))}</div>
        </div>
      `;
    })
    .join("");
}

function addFlaggedMessage(text, term) {
  const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const item = {
    id,
    text: String(text || "").trim(),
    term: String(term || "").trim(),
    createdAt: Date.now(),
    status: "pending",
  };

  // newest first
  state.flagged.unshift(item);

  // keep list reasonable
  if (state.flagged.length > 100) state.flagged = state.flagged.slice(0, 100);

  saveFlaggedToStorage();
  renderFlaggedList();
  return id;
}

function updateFlaggedStatus(id, status) {
  if (!id) return;
  const idx = state.flagged.findIndex((x) => x.id === id);
  if (idx === -1) return;
  state.flagged[idx].status = status;
  saveFlaggedToStorage();
  renderFlaggedList();
}

function anyModalOpen() {
  const notifyOpen = notifyModalEl && !notifyModalEl.classList.contains("hidden");
  const flaggedOpen = flaggedModalEl && !flaggedModalEl.classList.contains("hidden");
  const rulesModalEl = document.getElementById("rulesModal");
  const rulesOpen = rulesModalEl && !rulesModalEl.classList.contains("hidden");
  return Boolean(notifyOpen || flaggedOpen || rulesOpen);
}

function showFlaggedModal() {
  if (!flaggedModalEl) return;
  // don't stack modals
  if (notifyModalEl && !notifyModalEl.classList.contains("hidden")) return;

  renderFlaggedList();
  document.body.classList.add("modal-open");
  flaggedModalEl.classList.remove("hidden");
}

function hideFlaggedModal() {
  if (!flaggedModalEl) return;
  flaggedModalEl.classList.add("hidden");
  if (!anyModalOpen()) document.body.classList.remove("modal-open");
}

function clearFlaggedMessages() {
  state.flagged = [];
  saveFlaggedToStorage();
  renderFlaggedList();
}

function findRestrictedTerm(text) {
  const cleaned = normalize(text);

  return (
    RESTRICTED_TERMS.find((term) => {
      const normalizedTerm = normalize(term);
      const pattern = new RegExp(`(^|\\s)${escapeRegExp(normalizedTerm)}(\\s|$)`, "i");
      return pattern.test(cleaned);
    }) || null
  );
}

function addMessage(role, content, options = {}) {
  const row = document.createElement("div");
  row.className = `message-row ${role}`;

  const bubble = document.createElement("div");
  bubble.className = `bubble ${role}`;

  if (options.warning) {
    bubble.classList.add("warning-bubble");
  }

  if (options.typing) {
    bubble.innerHTML = `
      <div class="label bot-label">
        <img src="Logo.png" alt="Bot Logo" class="bot-logo">
      </div>
      <div class="typing">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </div>
    `;
  } else if (role === "assistant") {
    bubble.innerHTML = `
      <div class="label bot-label">
        <img src="Logo.png" alt="Bot Logo" class="bot-logo">
      </div>
      <div>${escapeHtml(content)}</div>
    `;
  } else {
    const avatar = options.avatar || state.userAvatar || "📚";
    bubble.innerHTML = `
    <div class="message-inline user-inline">
      <span class="user-avatar" aria-hidden="true">${escapeHtml(avatar)}</span>
      <span class="user-text"><strong>YOU:</strong> ${escapeHtml(content)}</span>
    </div>
    `;
  }

  row.appendChild(bubble);
  messagesEl.appendChild(row);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  return row;
}

function removeTypingRow() {
  const typing = document.getElementById("typingRow");
  if (typing) typing.remove();
}

function setLoading(isLoading) {
  state.loading = isLoading;
  sendBtn.disabled = isLoading;
  inputEl.disabled = isLoading;

  removeTypingRow();

  if (isLoading) {
    const typingRow = addMessage("assistant", "", { typing: true });
    typingRow.id = "typingRow";
  }
}

function showUnsafePrompt(topic) {
  if (!topic) return;

  unsafeTextEl.textContent =
    `This topic may need help from a trusted grown-up. ` +
    `Do you want me to notify your parents so they can help you with "${topic}"?`;

  unsafePromptEl.classList.remove("hidden");
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function hideUnsafePrompt() {
  unsafePromptEl.classList.add("hidden");
}

function setModalVariant(variant) {
  if (!modalCardEl || !modalIconEl) return;

  modalCardEl.classList.remove("modal-success", "modal-danger");
  modalIconEl.classList.remove("modal-icon-success", "modal-icon-danger");

  if (variant === "success") {
    modalCardEl.classList.add("modal-success");
    modalIconEl.classList.add("modal-icon-success");
  } else if (variant === "danger") {
    modalCardEl.classList.add("modal-danger");
    modalIconEl.classList.add("modal-icon-danger");
  }
}

function showDecisionModal(title, message, variant = "success") {
  if (modalTitleEl) modalTitleEl.textContent = title;
  if (modalTextEl) modalTextEl.textContent = message;

  setModalVariant(variant);

  document.body.classList.add("modal-open");
  notifyModalEl.classList.remove("hidden");
}

function hideNotifyModal() {
  notifyModalEl.classList.add("hidden");
  if (!anyModalOpen()) document.body.classList.remove("modal-open");
}

function clearRestrictedState() {
  state.pendingUnsafe = null;
  hideUnsafePrompt();
}

// ===== Model providers =====
let statusEl = null;

function setStatus(text, kind = "info") {
  if (!statusEl) {
    const header = document.querySelector(".chat-header");
    if (!header) return;
    statusEl = document.createElement("div");
    statusEl.className = "model-status";
    statusEl.setAttribute("aria-live", "polite");
    header.appendChild(statusEl);
  }
  statusEl.textContent = text || "";
  statusEl.dataset.kind = kind;
  statusEl.classList.toggle("hidden", !text);
}

let webllmEnginePromise = null;

function loadWebLLM() {
  if (webllmEnginePromise) return webllmEnginePromise;

  webllmEnginePromise = (async () => {
    if (!navigator.gpu) {
      throw new Error(
        "this browser can't run ChatKid's brain. Please open ChatKid in Google Chrome or Microsoft Edge on a laptop or desktop."
      );
    }
    setStatus("Getting ChatKid ready…", "info");
    const webllm = await import(CONFIG.webllm.library);
    const engine = await webllm.CreateMLCEngine(CONFIG.webllm.model, {
      initProgressCallback: (report) => {
        const pct = Math.round((report?.progress || 0) * 100);
        setStatus(`Getting ChatKid ready… ${pct}%`, "info");
      },
    });
    setStatus("", "info");
    return engine;
  })();

  webllmEnginePromise.catch((error) => {
    setStatus(`ChatKid could not start: ${error.message}`, "error");
    webllmEnginePromise = null;
  });

  return webllmEnginePromise;
}

async function postToWebLLM(messages, onToken) {
  const engine = await loadWebLLM();
  // Stream the answer so words appear as soon as the model starts writing,
  // instead of waiting for the whole answer.
  const stream = await engine.chat.completions.create({
    messages,
    temperature: CONFIG.temperature,
    max_tokens: CONFIG.maxTokens,
    stream: true,
  });
  let text = "";
  for await (const chunk of stream) {
    const delta = chunk?.choices?.[0]?.delta?.content || "";
    if (!delta) continue;
    text += delta;
    if (onToken) onToken(cleanModelText(text));
  }
  return cleanModelText(text);
}

// Run one tiny answer right after loading, so the first real question
// doesn't also pay the one-time GPU start-up cost.
async function warmUpWebLLM() {
  try {
    const engine = await loadWebLLM();
    await engine.chat.completions.create({
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: "Hi" },
      ],
      max_tokens: 1,
    });
  } catch (e) {}
}

async function postToOllama(messages) {
  let response;

  try {
    response = await fetch(CONFIG.ollama.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: CONFIG.ollama.model, stream: false, messages }),
    });
  } catch (error) {
    throw new Error(
      "I could not reach Ollama. Make sure Ollama is running locally and the model is installed."
    );
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Ollama request failed (${response.status})${errorText ? `: ${errorText.slice(0, 160)}` : ""}`
    );
  }

  const data = await response.json();
  return cleanModelText(data?.message?.content?.trim() || "");
}

async function postToProxy(messages) {
  if (!CONFIG.proxy.url) {
    throw new Error("the proxy URL is not set. Add it to CONFIG.proxy.url in app.js.");
  }

  let response;
  try {
    response = await fetch(CONFIG.proxy.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, max_tokens: CONFIG.maxTokens }),
    });
  } catch (error) {
    throw new Error("I could not reach the ChatKid server. Check the internet connection.");
  }

  if (!response.ok) {
    throw new Error(`the ChatKid server returned an error (${response.status}).`);
  }

  const data = await response.json();
  return cleanModelText(data?.reply || "");
}

async function postToModel(messages, onToken) {
  if (CONFIG.provider === "ollama") return postToOllama(messages);
  if (CONFIG.provider === "proxy") return postToProxy(messages);
  return postToWebLLM(messages, onToken);
}

async function callChatApi(userText, onToken) {
  const messages = [
    {
      role: "system",
      content: buildSystemPrompt(),
    },
    ...getRecentHistory(),
    {
      role: "user",
      content: userText,
    },
  ];

  const text = await postToModel(messages, onToken);
  return text || "Hmm, I couldn't think of an answer. Can you ask me again?";
}

function setMood(mood) {
  document.body.dataset.mood = mood;
  try {
    localStorage.setItem("kidsafe_mood", mood);
  } catch (e) {}

  moodButtons.forEach((btn) => {
    btn.classList.toggle("active", (btn.dataset.mood || "default") === mood);
  });
}

function setAvatar(avatar) {
  state.userAvatar = avatar;
  try {
    localStorage.setItem("kidsafe_avatar", avatar);
  } catch (e) {}

  avatarButtons.forEach((btn) => {
    btn.classList.toggle("active", (btn.dataset.avatar || "📚") === avatar);
  });
}

async function sendMessage(textOverride) {
  if (state.loading) return;

  const text = (textOverride ?? inputEl.value).trim();
  if (!text) return;

  hideUnsafePrompt();

  const restricted = findRestrictedTerm(text);

  if (restricted) {
    // Do not add restricted text to chat or history
    const flaggedId = addFlaggedMessage(text, restricted);

    inputEl.value = "";

    state.pendingUnsafe = {
      text,
      topic: restricted,
      flaggedId,
    };

    showUnsafePrompt(restricted);
    inputEl.focus();
    return;
  }

  addMessage("user", text, { avatar: state.userAvatar });
  addToHistory("user", text);
  inputEl.value = "";

  setLoading(true);

  let liveRow = null;
  const showPartial = (partial) => {
    if (!partial) return;
    if (!liveRow) {
      removeTypingRow();
      liveRow = addMessage("assistant", partial);
      return;
    }
    const textEl = liveRow.querySelector(".bubble > div:last-child");
    if (textEl) textEl.textContent = partial;
    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  try {
    const reply = await callChatApi(text, showPartial);
    removeTypingRow();
    hideUnsafePrompt();
    if (liveRow) {
      const textEl = liveRow.querySelector(".bubble > div:last-child");
      if (textEl) textEl.textContent = reply;
    } else {
      addMessage("assistant", reply);
    }
    addToHistory("assistant", reply);
    clearRestrictedState();
  } catch (error) {
    if (liveRow) liveRow.remove();
    removeTypingRow();
    const errorMessage = `Sorry — ${error.message}`;
    addMessage("assistant", errorMessage);
    addToHistory("assistant", errorMessage);
  } finally {
    setLoading(false);
    inputEl.focus();
  }
}

sendBtn.addEventListener("click", () => sendMessage());

inputEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    sendMessage();
  }
});

suggestionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    sendMessage(button.dataset.suggestion || button.textContent || "");
  });
});

notifyYesBtn.addEventListener("click", () => {
  const topic = state.pendingUnsafe?.topic || "this topic";
  const flaggedId = state.pendingUnsafe?.flaggedId;
  clearRestrictedState();

  if (flaggedId) updateFlaggedStatus(flaggedId, "notified");

  showDecisionModal(
    "Parents notified",
    `Parents have been notified about "${topic}".`,
    "success"
  );
});

notifyNoBtn.addEventListener("click", () => {
  const topic = state.pendingUnsafe?.topic || "this topic";
  const flaggedId = state.pendingUnsafe?.flaggedId;
  clearRestrictedState();

  if (flaggedId) updateFlaggedStatus(flaggedId, "not-notified");

  showDecisionModal(
    "Parents not notified",
    `Parents have not been notified about "${topic}". We will avoid this topic for now.`,
    "danger"
  );

  inputEl.focus();
});

closeModalBtn.addEventListener("click", () => {
  hideNotifyModal();
  inputEl.focus();
});

// Click outside will not close the popup; use the Close button.

// ===== Flagged button + modal =====
if (flaggedFabEl) {
  flaggedFabEl.addEventListener("click", () => {
    showFlaggedModal();
  });
}

if (closeFlaggedBtn) {
  closeFlaggedBtn.addEventListener("click", () => {
    hideFlaggedModal();
    inputEl.focus();
  });
}

if (clearFlaggedBtn) {
  clearFlaggedBtn.addEventListener("click", () => {
    clearFlaggedMessages();
  });
}

// ===== RuleBook button + panel =====
document.getElementById("rulesFab")?.addEventListener("click", () => showRulesModal());
document.getElementById("closeRulesBtn")?.addEventListener("click", () => {
  hideRulesModal();
  inputEl.focus();
});

// ===== Mood selector =====
(function initMood() {
  let mood = "default";
  try {
    mood = localStorage.getItem("kidsafe_mood") || "default";
  } catch (e) {}

  if (!["default", "happy", "sad", "angry", "crying", "confused"].includes(mood)) {
    mood = "default";
  }

  setMood(mood);
})();

moodButtons.forEach((btn) => {
  btn.addEventListener("click", () => setMood(btn.dataset.mood || "default"));
});

// ===== Avatar picker =====
(function initAvatar() {
  let avatar = "📚";
  try {
    avatar = localStorage.getItem("kidsafe_avatar") || "📚";
  } catch (e) {}
  setAvatar(avatar);
})();

avatarButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    setAvatar(btn.dataset.avatar || "📚");
  });
});

// ===== Microphone (speech-to-text) =====
let recognition = null;
let listening = false;

function supportsSpeechRecognition() {
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

function ensureRecognition() {
  if (recognition) return recognition;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const result = event.results[event.results.length - 1];
    const transcript = result?.[0]?.transcript || "";
    if (transcript) {
      inputEl.value = transcript.trim();
    }
    if (result?.isFinal) {
      inputEl.focus();
    }
  };

  recognition.onend = () => {
    listening = false;
    micBtn?.classList.remove("listening");
  };

  recognition.onerror = () => {
    listening = false;
    micBtn?.classList.remove("listening");
  };

  return recognition;
}

if (micBtn) {
  micBtn.addEventListener("click", () => {
    if (!supportsSpeechRecognition()) {
      const msg = "Voice input is not supported in this browser.";
      addMessage("assistant", msg);
      addToHistory("assistant", msg);
      return;
    }

    const rec = ensureRecognition();

    if (listening) {
      listening = false;
      micBtn.classList.remove("listening");
      try {
        rec.stop();
      } catch (e) {}
      return;
    }

    listening = true;
    micBtn.classList.add("listening");
    try {
      rec.start();
    } catch (e) {
      listening = false;
      micBtn.classList.remove("listening");
    }
  });
}

// ===== Particle background =====
(function initParticleBackground() {
  const canvas = document.getElementById("bgCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let width = 0;
  let height = 0;
  let animationId = null;

  const mouse = {
    x: -9999,
    y: -9999,
    radius: 120,
  };

  const particles = [];
  const PARTICLE_COUNT = 70;

  function resizeCanvas() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function random(min, max) {
    return Math.random() * (max - min) + min;
  }

  function getParticleStyles() {
    const styles = getComputedStyle(document.body);
    return {
      dot: styles.getPropertyValue("--particle-dot").trim() || "rgba(0, 51, 160, 0.28)",
      line: styles.getPropertyValue("--particle-line").trim() || "rgba(0, 51, 160, 0.08)",
    };
  }

  function createParticle() {
    return {
      x: random(0, width),
      y: random(0, height),
      vx: random(-0.35, 0.35),
      vy: random(-0.35, 0.35),
      size: random(2, 5),
    };
  }

  function initParticles() {
    particles.length = 0;
    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
      particles.push(createParticle());
    }
  }

  function drawParticle(p, styles) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = styles.dot;
    ctx.fill();
  }

  function connectParticles(styles) {
    for (let i = 0; i < particles.length; i += 1) {
      for (let j = i + 1; j < particles.length; j += 1) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 110) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = styles.line;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }
  }

  function updateParticle(p) {
    const dx = mouse.x - p.x;
    const dy = mouse.y - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < mouse.radius && dist > 0) {
      const force = (mouse.radius - dist) / mouse.radius;
      const angle = Math.atan2(dy, dx);

      p.x -= Math.cos(angle) * force * 2.2;
      p.y -= Math.sin(angle) * force * 2.2;
    } else {
      p.x += p.vx;
      p.y += p.vy;
    }

    if (p.x < -20) p.x = width + 20;
    if (p.x > width + 20) p.x = -20;
    if (p.y < -20) p.y = height + 20;
    if (p.y > height + 20) p.y = -20;
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);

    if (state.particlesEnabled) {
      const styles = getParticleStyles();

      for (const p of particles) {
        updateParticle(p);
        drawParticle(p, styles);
      }

      connectParticles(styles);
    }

    animationId = requestAnimationFrame(animate);
  }

  window.addEventListener("mousemove", (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
  });

  window.addEventListener("mouseleave", () => {
    mouse.x = -9999;
    mouse.y = -9999;
  });

  window.addEventListener("resize", () => {
    resizeCanvas();
    initParticles();
  });

  resizeCanvas();
  initParticles();
  animate();

  window.addEventListener("beforeunload", () => {
    if (animationId) cancelAnimationFrame(animationId);
  });
})();

// Initialize flagged messages
state.flagged = loadFlaggedFromStorage();
renderFlaggedList();

// Show welcome message on screen
addMessage("assistant", WELCOME_MESSAGE);
addToHistory("assistant", WELCOME_MESSAGE);

// Start downloading/loading the in-browser model right away, so it is ready before the first question.
if (CONFIG.provider === "webllm") {
  loadWebLLM().then(() => warmUpWebLLM()).catch(() => {});
}