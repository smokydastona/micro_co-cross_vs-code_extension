# Copilot Cross-Reference (VS Code Extension)

Cross-check text/code in VS Code using either:

- **Microsoft Copilot (web)** opened inside VS Code (Simple Browser), or
- **ChatGPT (OpenAI API)** with results shown in a VS Code panel.

## Commands

- **Copilot Cross-Reference: Open Microsoft Copilot**
- **Copilot Cross-Reference: Ask Microsoft Copilot About Selection**
- **Copilot Cross-Reference: Ask Microsoft Copilot (Prompt)**
- **Copilot Cross-Reference: Set OpenAI API Key**
- **Copilot Cross-Reference: Clear OpenAI API Key**
- **Copilot Cross-Reference: Debate in ChatGPT (Selection)**
- **Copilot Cross-Reference: Debate in ChatGPT (Prompt)**

## How it “cross-references”

VS Code extensions don’t have a supported API to read GitHub Copilot’s internal “choices/decisions” directly.

Also, **Windows Copilot** doesn’t expose a supported VS Code extension API to open it, send it text, or read responses.

If you choose the `chatgpt` target, the extension uses the **OpenAI API** (with your API key stored in VS Code Secret Storage) and shows the response in a VS Code panel.

The “Debate” commands run two ChatGPT passes:

1. **Critic**: finds issues/risks/alternatives.
2. **Builder**: produces an improved version + action items.

Then it can keep iterating Critic → Builder until the checklist is empty (bounded by a max round setting).

So this extension provides a practical workflow:

1. Select the text you want checked (an answer, plan, code, etc.).
2. Run **Ask Microsoft Copilot About Selection**.
3. The extension opens Microsoft Copilot *inside VS Code* and (optionally) copies a prepared prompt to your clipboard.
4. Paste the prompt into Copilot and compare feedback.

## Settings

- `copilotCrossRef.target`: `web` (default) opens copilot.microsoft.com; `windows` copies the prompt and shows instructions to paste into Windows Copilot; `chatgpt` calls the OpenAI API and shows results in VS Code.
- `copilotCrossRef.openaiModel`: OpenAI model name used when `target=chatgpt`.
- `copilotCrossRef.openaiBaseUrl`: OpenAI API base URL (only needed for proxies/gateways).
- `copilotCrossRef.onboardingPrompt`: When `true`, prompts on startup to set an OpenAI API key if `target=chatgpt` and no key is stored.
- `copilotCrossRef.debateMaxRounds`: Max Critic→Builder rounds. Debate stops early when the checklist has no `- [ ]` items.
- `copilotCrossRef.copilotUrl`: Base URL for Copilot (default `https://copilot.microsoft.com/`).
- `copilotCrossRef.openInSimpleBrowser`: Open inside VS Code Simple Browser.
- `copilotCrossRef.prefillQueryInUrl`: Best-effort prefill via URL param (off by default).
- `copilotCrossRef.promptTemplate`: Template for the prompt. Use `{{text}}`.
- `copilotCrossRef.copyPromptToClipboard`: Copy prompt to clipboard (on by default).

## ChatGPT setup

1. Set `copilotCrossRef.target` to `chatgpt`.
2. Run **Copilot Cross-Reference: Set OpenAI API Key**.
3. Use either **Ask … About Selection** or **Ask … (Prompt)**.

Notes:

- The API key is stored in **VS Code Secret Storage** (not in your repo).
- If you hit “Don’t ask again” on the startup prompt, clearing the key will allow onboarding to prompt again.

## Debate mode

- Select text and run **Debate in ChatGPT (Selection)**, or
- Run **Debate in ChatGPT (Prompt)** and type your idea.

The debate loop continues until the **Action Items** checklist contains no unchecked items (`- [ ]`), or until `copilotCrossRef.debateMaxRounds` is reached.

## Install

This repo supports two common install workflows:

### Install from VSIX (local)

1. In the repo folder: `npm install`
2. Build a VSIX: `npm run package`
3. Install the generated `.vsix`:
	- Command line: `code --install-extension .\copilot-cross-reference-<version>.vsix`
	- Or VS Code UI: Extensions → `...` menu → **Install from VSIX...**

### Run in dev (Extension Development Host)

1. `npm install`
2. Press `F5`

## Security

- Never paste API keys into issues, chats, or logs.
- If a key is ever shared accidentally, revoke/rotate it immediately.

## Run & debug

1. `npm install`
2. Press `F5` in VS Code to launch the Extension Development Host.
3. In the new window, open the Command Palette and run one of the commands above.
