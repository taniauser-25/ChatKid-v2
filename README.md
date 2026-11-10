# ChatKid

ChatKid is a research prototype of a child-centered chatbot for children aged 6–11. It answers children's everyday questions in a safe, age-appropriate way, follows a **RuleBook written by children**, and asks before involving a parent when a question may need a grown-up's help.

**Current version:** 2.0.0 (shown at the bottom of the ChatKid page). See [CHANGELOG.md](CHANGELOG.md) for what changed.

---

## What ChatKid does

- **Child-friendly chat:** kids can type or use the microphone, pick a mood and an avatar, and tap suggested questions.
- **Kids' RuleBook:** ChatKid follows 14 rules that children wrote in a KidsTeam co-design session (2026-11-05).
- **RuleBook panel:** the RuleBook button shows children the DO and DON'T rules and who can change each one.
- **Safety check:** questions containing sensitive words (for example, weapons) trigger an "ask a grown-up" prompt before the AI answers.
- **Child-controlled parent involvement:** the child chooses whether to notify their parents. Flagged questions are saved in the Flagged list on that device only.
- **Private by default:** the AI model runs inside the browser, so children's messages never leave the computer.

## The Kids' RuleBook

| DO rules | DON'T rules |
|---|---|
| Ask for permission before making decisions. | Never give dangerous information. |
| Make sure you understand what kids are saying. | Never make the same mistakes again and again. |
| Give ideas for YouTube videos. | Never just give the answer. Help kids understand and learn. |
| Give ideas for family trips. | Never teach things parents can teach, like how to draw a heart. |
| Help kids stay away from doing bad things. | Never make mistakes. Say "I'm not sure" instead of guessing. |
| Follow instructions exactly and give accurate answers. | Never explain how to use weapons. |
| | Never get angry or "crash out." |
| | Never give false answers. |

The rules are stored in `KIDS_RULEBOOK` in `app.js`. Each rule keeps the children's exact words (`kidsWords`), the rule sentence shown to children (`rule`), instructions for the model (`howTo`), and who the children said can change it (`whoCanChange`).

Two rules children wrote are not included yet because ChatKid can't do them: recognizing live sign language, and recognizing a child's voice versus an adult's.

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
- On weaker laptops, add `?model=Llama-3.2-1B-Instruct-q4f16_1-MLC` to the address to use a smaller model (about 0.9 GB).

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

### Option 4: With a hosted model

For laptops that can't run the in-browser model, `server/cloudflare-worker.js` is a small server that forwards questions to a hosted model while keeping the API key secret. Setup steps are at the top of that file. Then open ChatKid with `?provider=proxy`.

> With this option, children's messages are sent to the model provider. Check that this is covered by your IRB.

## Settings

All settings are at the top of `app.js`:

| Setting | What it does |
|---|---|
| `APP_VERSION` | The version shown in the footer |
| `CONFIG.provider` | Where the AI runs: `webllm` (in the browser), `ollama`, or `proxy` |
| `CONFIG.webllm.model` | Which in-browser model to use |
| `RESTRICTED_TERMS` | Words that trigger the "ask a grown-up" prompt |
| `KIDS_RULEBOOK` | The children's rules |

You can also change the provider or model from the address bar, for example `?provider=ollama` or `?model=Llama-3.2-1B-Instruct-q4f16_1-MLC`.

## Project files

| File | Purpose |
|---|---|
| `index.html` | Page layout |
| `styles.css` | Visual design |
| `app.js` | Chat logic, safety check, RuleBook, and model connection |
| `rulebook-icon.svg` | RuleBook icon |
| `server/cloudflare-worker.js` | Optional server for a hosted model |
| `CHANGELOG.md` | Version history |

## Releasing a new version

ChatKid uses [semantic versioning](https://semver.org/) (MAJOR.MINOR.PATCH): bug fixes raise the last number (2.0.1), new features the middle number (2.1.0), and big changes the first number (3.0.0).

1. Update `APP_VERSION` in `app.js`.
2. Update the `?v=` numbers for `styles.css` and `app.js` in `index.html`, so browsers load the new files.
3. Add an entry to `CHANGELOG.md`.
4. Create a release on GitHub with a tag such as `v2.0.1`.

## Technologies

HTML, CSS, JavaScript · [WebLLM](https://github.com/mlc-ai/web-llm) (in-browser AI) · Llama 3.2 3B Instruct · optional Ollama or hosted model

## Research context

ChatKid was developed in the KidsTeam lab at Boise State University as part of research on children's agency in child–parent–AI interaction. The RuleBook comes from a cooperative inquiry session in which children wrote rules for AI chatbots and chose who should be able to change them.

© 2026 Meherunnesa Tania
