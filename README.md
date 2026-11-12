# ChatKid

ChatKid is a research prototype of a child-centered chatbot for children aged 6–11. It answers children's everyday questions in a safe, age-appropriate way, follows a **RuleBook written by children**, and asks before involving a parent when a question may need a grown-up's help.

**Current version:** 2.4.3 (shown at the bottom of the ChatKid page). See [CHANGELOG.md](CHANGELOG.md) for what changed.

---

## What ChatKid does

- **Child-friendly chat:** kids can type or use the microphone, pick a mood and an avatar, and tap suggested questions.
- **Kids' RuleBook:** ChatKid follows the rules that children wrote in a KidsTeam co-design session (2026-11-05): 16 rules, merged into 12 labelled rules (MR1D–MR6D, MR1ND–MR6ND).
- **Rule engine:** `rulebook-engine.js` checks every question and every answer against the rules, without using AI, so the rules are followed even when the AI model slips.
- **RuleBook panel:** the RuleBook button shows children the 12 DO and DON'T rules and who can change each one.
- **Safety check:** questions containing sensitive words (for example, weapons) trigger an "ask a grown-up" prompt before the AI answers.
- **Child-controlled parent involvement:** the child chooses whether to notify their parents. Flagged questions are saved in the Flagged list on that device only.
- **Private by default:** the AI model runs inside the browser, so children's messages never leave the computer.

## The Kids' RuleBook

Children wrote 16 rules in three teams. Similar rules were merged into 12, the same 12 rules (with the same labels) used in the parent survey and the printed session sheets.

| Label | Type | Rule: the AI chatbot should / should not... | Merged from | Who can change it (teams' choice) |
|---|---|---|---|---|
| MR1D | DO | Ask kids for permission before making decisions. | T1R1D | Kids & parents together |
| MR2D | DO | Understand what kids say and follow it exactly. | T1R2D + T3R7D | Kids & parents together |
| MR3D | DO | Give ideas, like ideas for YouTube videos or family trips. | T1R3D + T2R4D | AI or Parent |
| MR4D | DO | Stop kids from doing bad things. | T2R5D | Parent |
| MR5D | DO | Recognize live sign language. | T3R6D | Kids & parents together |
| MR6D | DO | Recognize a child's voice versus an adult's voice, and bleep out swear words for children. | T3R8D | Parent |
| MR1ND | DON'T | Give dangerous information, like how to use weapons. | T1R1ND + T3R6ND | Parent |
| MR2ND | DON'T | Make mistakes. | T1R2ND + T2R5ND | Kids or No one |
| MR3ND | DON'T | Give false answers. | T3R8ND | Kids & parents together |
| MR4ND | DON'T | Always give the answer. It should help kids understand and learn. | T1R3ND | Parent |
| MR5ND | DON'T | Teach things kids can learn from their parents, like how to draw a heart. | T2R4ND | Kids & parents together or Parent & AI together |
| MR6ND | DON'T | "Crash out" (get angry). | T3R7ND | Kids & parents together |

The rules are stored in `KIDS_RULEBOOK` in `app.js`. Each rule has its label (`id`), the wording shown to children (`rule`), the wording given to the AI model (`prompt`), instructions for the model (`howTo`), and the original team rules it came from (`from`), each with the children's exact words and who that team said can change it.

Two rules can only be followed in part. ChatKid has no camera, so for "recognize live sign language" it says honestly that it cannot see signs yet. It cannot tell a child's voice from an adult's, so it treats everyone as a kid and bleeps swear words, which is the reason the children gave for that rule.

### How the rules are enforced

| Rule | What the rule engine does |
|---|---|
| Never just give the answer | Detects math questions, gives a hint, checks the child's answer in code, and explains only after three tries. Removes the answer if the AI gives it away. |
| Never make mistakes / never give false answers | Checks arithmetic itself. Blocks made-up weather, news, and temperatures. Gives the real date and time from the device. |
| Never teach things parents can teach | Detects simple skills (drawing a heart, tying shoes) and points the child to a grown-up. Blocks step-by-step instructions. |
| Never get angry or "crash out" | Refuses kindly when asked to be mean, and blocks unkind words in answers. |
| Follow instructions exactly | Says honestly when it cannot play music, make pictures, or show videos. |
| Make sure you understand | Asks the child to say more when a message is unclear. |
| Bleep swear words | Replaces swear words with \*beep\* in questions and answers. |
| Never give dangerous information / weapons | Sensitive words trigger the "ask a grown-up" prompt before the AI sees the question. |

Run the tests with `node tests/rulebook-engine.test.js`.

## How it works

1. The child asks a question.
2. The safety check looks for sensitive words. If it finds one, ChatKid asks whether to notify a parent instead of answering.
3. Otherwise, the question goes to the AI model with the Kids' RuleBook as its instructions.
4. ChatKid shows the answer.

## Running ChatKid

### Option 1: Online (recommended)

ChatKid runs on any static website, such as GitHub Pages. No server, API key, or installation is needed.

**Publish on GitHub Pages**
1. In the repository, go to **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/ (root)`, and click **Save**.
3. After about a minute, ChatKid is live at `https://<your-username>.github.io/<repo-name>/`.

> GitHub Pages works with public repositories on a free account. Private repositories need GitHub Pro (free for students through the GitHub Student Developer Pack).

**Computer requirements**
- **Google Chrome or Microsoft Edge** on a laptop or desktop (the browser needs WebGPU).
- **The first visit downloads the AI model (about 2 GB).** Open ChatKid on each session laptop beforehand so the model is saved. Later visits load in seconds.
- ChatKid uses the small Llama 3.2 1B model by default (about 0.9 GB), which answers in a few seconds on most laptops. On a strong laptop, add `?model=Llama-3.2-3B-Instruct-q4f16_1-MLC` to the address for better answers (about 2 GB, slower).

### Option 2: On your own computer

1. Download or clone this repository.
2. In the project folder, start a local server:
   ```bash
   python -m http.server 8000
   ```
3. Open `http://localhost:8000` in Chrome or Edge.

### Option 3: With Ollama (the original v1 setup)

1. Install [Ollama](https://ollama.com) and download the model:
   ```bash
   ollama pull llama3.2:3b
   ```
2. Start a local server as in Option 2.
3. Open `http://localhost:8000/?provider=ollama`.

### Option 4: With boisestate.ai (fast, hosted by Boise State)

ChatKid can use Boise State University's AI service, [boisestate.ai](https://boisestate.ai), through a small Cloudflare Worker that keeps the API key secret. Answers arrive in a few seconds on any laptop.

1. On boisestate.ai, go to **Settings → API Keys** and create a key.
2. Create a Cloudflare Worker, paste in `server/boisestate-worker.js`, and add the key as a secret named `BOISESTATE_AI_KEY` (full steps are at the top of that file).
3. Put the Worker's address in `CONFIG.proxy.url` in `app.js`. ChatKid then uses boisestate.ai automatically; add `?provider=webllm` to the address to use the in-browser model instead.

> boisestate.ai keys expire every 90 days, and usage counts toward your monthly boisestate.ai quota. Messages are sent to boisestate.ai, so make sure your IRB covers this.

`server/cloudflare-worker.js` is an alternative server for Anthropic's Claude API.

## Settings

All settings are at the top of `app.js`:

| Setting | What it does |
|---|---|
| `APP_VERSION` | The version shown in the footer |
| `CONFIG.provider` | Where the AI runs: `auto` (default: tries the boisestate.ai server, and uses `webllm` if it does not answer), `webllm`, `ollama`, or `proxy` |
| `CONFIG.webllm.model` | Which in-browser model to use |
| `RESTRICTED_TERMS` | Words that trigger the "ask a grown-up" prompt |
| `KIDS_RULEBOOK` | The children's rules |

You can also change the provider or model from the address bar, for example `?provider=ollama` or `?model=Llama-3.2-3B-Instruct-q4f16_1-MLC`.

## Project files

| File | Purpose |
|---|---|
| `index.html` | Page layout |
| `styles.css` | Visual design |
| `app.js` | Chat logic, safety check, RuleBook, and model connection |
| `rulebook-engine.js` | Rule checks that run before and after the AI answers |
| `tests/rulebook-engine.test.js` | Tests for the rule engine |
| `rulebook-icon.svg` | RuleBook icon |
| `server/boisestate-worker.js` | Server for boisestate.ai (hosted by Boise State) |
| `server/cloudflare-worker.js` | Alternative server for Anthropic's Claude API |
| `CHANGELOG.md` | Version history |

## Releasing a new version

ChatKid uses [semantic versioning](https://semver.org/) (MAJOR.MINOR.PATCH): bug fixes raise the last number (2.0.1), new features the middle number (2.1.0), and big changes the first number (3.0.0).

1. Update `APP_VERSION` in `app.js`.
2. Update the `?v=` numbers for `styles.css`, `rulebook-engine.js`, and `app.js` in `index.html`, so browsers load the new files.
3. Add an entry to `CHANGELOG.md`.
4. Create a release on GitHub with a tag such as `v2.0.1`.

## Technologies

HTML, CSS, JavaScript · [WebLLM](https://github.com/mlc-ai/web-llm) (in-browser AI) · Llama 3.2 3B Instruct · optional Ollama or hosted model

## Research context

ChatKid was developed in the KidsTeam lab at Boise State University as part of research on children's agency in child–parent–AI interaction. The RuleBook comes from a cooperative inquiry session in which children wrote rules for AI chatbots and chose who should be able to change them.

© 2026 Meherunnesa Tania
