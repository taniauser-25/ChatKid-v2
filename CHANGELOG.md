# Changelog

All notable changes to ChatKid are listed here.
This project follows [Semantic Versioning](https://semver.org/): MAJOR.MINOR.PATCH.

## [2.4.0] - 2026-11-11

### Changed
- **The RuleBook now has the 12 merged rules** (6 DO, 6 DON'T) in place of the 16 original rules, with the same labels used in the parent survey and the printed session sheets (MR1D–MR6D, MR1ND–MR6ND). Each rule shows its label and who the children said can change it; when two teams chose differently, both choices are shown.
- Each rule keeps the original team rules it came from (for example, MR2D comes from T1R2D and T3R7D), with the children's own words.
- The rule engine's log messages use the new labels.

## [2.3.3] - 2026-11-11

### Changed
- When ChatKid runs on the slower in-browser model, rules with a fixed answer (things a parent can teach, music and pictures, weather and news, sign language, being asked to get angry) are answered instantly by the rule engine.

### Fixed
- Math hints said "1 blocks"; they now say "1 block".

## [2.3.2] - 2026-11-11

### Changed
- Math hints and answer checks now come straight from the rule engine, so they appear instantly and are always correct.

### Fixed
- ChatKid sometimes repeated its hidden rule reminder in an answer. Reminders are now removed from answers before the child sees them.

## [2.3.1] - 2026-11-11

### Fixed
- ChatKid sometimes answered "Sorry — Object has already been disposed" when a question arrived while the in-browser model was still warming up. Requests to the model now wait their turn, and if the model stops working ChatKid restarts it and tries again.

## [2.3.0] - 2026-11-11

### Added
- **Rule engine (`rulebook-engine.js`):** every message is checked against the kids' rules before the AI answers, and the AI's answer is checked again before the child sees it. If an answer breaks a rule, ChatKid shows a safe answer instead. No AI is used for these checks, so they work the same way every time.
- **All 16 rules are now in the RuleBook.** The two that ChatKid can only follow in part are labelled: it cannot see sign language (it says so honestly), and it cannot tell a child's voice from an adult's (so it treats everyone as a kid and bleeps swear words).
- **Math helper:** ChatKid never gives the answer first. It gives a hint, checks the child's answer itself (so it never says a wrong answer is right), gives a second hint, and explains the solution only after three tries.
- **Swear words are bleeped** in what the child types and in ChatKid's answers.
- **Automatic backup:** ChatKid tries the boisestate.ai server first. If it does not answer within 6 seconds, ChatKid uses the in-browser model, so it always works.
- Tests for the rule engine: `node tests/rulebook-engine.test.js`.

### Changed
- Clearer instructions and short examples for the AI, and a lower temperature (0.3) for steadier answers.
- On laptop-width screens the Flagged and RuleBook buttons are round icons at the edge, so they no longer cover the chat.

## [2.2.0] - 2026-11-09

### Added
- **boisestate.ai support:** `server/boisestate-worker.js` connects ChatKid to Boise State University's AI service (Amazon Nova Lite by default) through a Cloudflare Worker that keeps the API key secret. Answers arrive in a few seconds on any laptop.
- ChatKid uses the hosted model automatically when `CONFIG.proxy.url` is set (`provider: "auto"`); otherwise it uses the in-browser model.
- Clear messages when the boisestate.ai key has expired, the monthly allowance is used up, or the service is busy.

## [2.1.1] - 2026-11-09

### Changed
- Shorter instructions for the model (about 65% shorter): the RuleBook rules are sent as short rule sentences, so the model has less to read before each answer and starts answering sooner.

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
