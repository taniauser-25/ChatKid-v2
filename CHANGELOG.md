# Changelog

All notable changes to ChatKid are listed here.
This project follows [Semantic Versioning](https://semver.org/): MAJOR.MINOR.PATCH.

## [2.1.0] - 2026-11-09

### Changed
- **Faster-feeling answers:** ChatKid's answers now appear word by word as they are written (streaming), instead of after the whole answer is finished.
- ChatKid runs a tiny warm-up answer right after loading, so the first question is faster.
- Answers are kept shorter (1–3 sentences, or up to 4 ideas), which makes them faster and easier for kids to read.
- ChatKid now remembers the last 6 messages instead of 8, so each answer has less to read.

## [2.0.0] - 2026-11-09

### Added
- **Kids' RuleBook:** ChatKid follows 14 rules written by children in a KidsTeam session (2026-11-05). Rules live in `KIDS_RULEBOOK` in `app.js`, written as rule sentences, with the children's exact words kept in `kidsWords`.
- **RuleBook panel:** a RuleBook button opens a panel showing the DO and DON'T rules and who can change each one.
- **Online use:** the model can run inside the browser (WebLLM, Llama 3.2 3B), so ChatKid works from a website such as GitHub Pages with no server or API key.
- Optional hosted-model proxy (`server/cloudflare-worker.js`).
- Loading status while the model downloads.
- Version number shown in the footer.

### Changed
- **Default model provider is now the in-browser model** instead of local Ollama (breaking change, hence 2.0.0). Use `?provider=ollama` for the original setup.
- Default Ollama model is now `llama3.2:3b`.
- Page title is now "ChatKid".

### Removed
- "fight", "fighting", "angry", "mad", "fair", "unfair" from the restricted-word filter, so the kids' rules can be tested.

## [1.0.0]

- First ChatKid prototype: child-friendly chat, keyword safety filter, parent-notification prompt, flagged messages, local Ollama model (`llama3.2:1b`).
