# Copilot instructions (Copilot Cross-Reference / Micro Co-Cross)

## Big picture
- This repo is a **VS Code extension** that helps you cross-reference text/code via:
  - **Microsoft Copilot (web)** opened in VS Code’s Simple Browser (or external browser fallback)
  - **ChatGPT/OpenAI API** (results shown in a VS Code panel)
  - A **Conversation Broker** that runs an automated **Model A ↔ Model B** back-and-forth with a live transcript webview.

## Repo layout (current workspace)
- Extension manifest: `package.json`
- Extension entrypoint: `src/extension.ts` → builds to `dist/extension.js`
- Conversation broker:
  - `src/broker/ConversationBroker.ts`, `src/broker/TurnEngine.ts`, `src/broker/Transcript.ts`
  - Stop conditions: `src/broker/StopConditions.ts`
- Commands:
  - Broker commands: `src/commands/*` (registered via `src/commands/index.ts`)
  - Cross-reference + key management commands are registered in `src/extension.ts`
- Model adapters:
  - `src/models/*` (OpenAI-compatible streaming via `/chat/completions` SSE)
  - Adapter factory: `src/models/factory.ts`
- Webviews:
  - Transcript panel: `src/ui/TranscriptPanel.ts` + `media/panel.html|panel.js|styles.css`
- Secrets:
  - `src/config/secrets.ts` (VS Code Secret Storage keys)

## Core behaviors (what matters)
- Cross-reference commands produce a prompt (template + selection/prompt), optionally copy to clipboard, and open Copilot web when targeting `web`.
- When targeting `chatgpt`, calls OpenAI-compatible API and renders the response in a VS Code panel.
- Conversation Broker alternates Model A and Model B, streaming tokens to the transcript panel.

## Command contract (agent-friendly)
- Prefer implementing new capabilities as **commands** and contribute them in `package.json`.
- If a command accepts args, it must support headless execution:
  - If args are provided: **no dialogs**; deterministic behavior.
  - If args are omitted: prompts are allowed as a human fallback.
- If you extend commands, prefer returning machine-readable results (`{ ok: true, ... }` / `{ ok: false, error }`).
- Log to the `Copilot Cross-Reference` OutputChannel (`src/util/logging.ts`) rather than adding lots of modal dialogs.

## Providers / adapters
- Supported providers in settings: `chatgpt | azureOpenai | lmstudio | ollama | deepseek`.
- Local providers:
  - LM Studio defaults: `http://localhost:1234/v1`
  - Ollama defaults: `http://localhost:11434/v1`
- Secrets are stored in VS Code Secret Storage (never in files):
  - `copilotCrossRef.openaiApiKey`
  - `copilotCrossRef.azureOpenAIApiKey`
  - `copilotCrossRef.deepseekApiKey`

## Packaging / publishing
- Build output: `dist/`
- Packaging uses VSCE (`@vscode/vsce`). Output `.vsix` files are gitignored (`*.vsix`).
- Key scripts:
  - `npm run compile`
  - `npm run package` (build + `vsce package`)

## Workflow after every change (required)

After implementing any requested change, ALWAYS run a full workspace scan/validation, then commit and push.

### Full workspace scan (do this every time)
- Check VS Code Problems across the workspace.
- Build: `npm run compile`.
- If you changed packaging or manifest contributions, also run: `npm run package` (then do **not** commit the `.vsix`).
- If you changed commands/settings behavior, update `README.md` and `CHANGELOG.md`.

### Fix + validate loop
1. Scan first (above)
2. Fix errors systematically (don’t stop after one)
3. Re-validate after each fix
4. Keep build artifacts out of git (`dist/` and `*.vsix` are already ignored)

### Commit + push
- Stage only real source/config/doc changes.
- Commit with a short, descriptive message (prefer `feat:`, `fix:`, `docs:`, `chore:`).
- Push to the current branch.

### “Scan likely impact radius” (what to double-check)
- **Manifest changes**: `package.json` commands/settings match actual registrations.
- **Broker loop changes**: `src/broker/*` stop conditions and transcript streaming remain consistent.
- **Adapter changes**: streaming parsing (`src/util/http.ts`) still handles SSE + `[DONE]` correctly.
- **Webview changes**: `media/panel.js` correctly renders `status/message/chunk` events.

## Quick smoke checks
- Extension build: `npm install` (or `npm ci`) then `npm run compile`
- Run dev host: press `F5` in VS Code
- Command Palette sanity:
  - `Copilot Cross-Reference: Ask Microsoft Copilot (Prompt)`
  - `Copilot Cross-Reference: Debate in ChatGPT (Prompt)`
  - `Micro Co-Cross: Start Conversation (Model A ↔ Model B)`
