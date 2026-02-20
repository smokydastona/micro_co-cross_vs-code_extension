# Copilot Cross-Reference (VS Code Extension)

Opens **Microsoft Copilot** inside VS Code (using the built-in Simple Browser) and helps you send prompts or your current editor selection to Copilot for cross-checking.

## Commands

- **Copilot Cross-Reference: Open Microsoft Copilot**
- **Copilot Cross-Reference: Ask Microsoft Copilot About Selection**
- **Copilot Cross-Reference: Ask Microsoft Copilot (Prompt)**

## How it “cross-references”

VS Code extensions don’t have a supported API to read GitHub Copilot’s internal “choices/decisions” directly.

So this extension provides a practical workflow:

1. Select the text you want checked (an answer, plan, code, etc.).
2. Run **Ask Microsoft Copilot About Selection**.
3. The extension opens Microsoft Copilot *inside VS Code* and (optionally) copies a prepared prompt to your clipboard.
4. Paste the prompt into Copilot and compare feedback.

## Settings

- `copilotCrossRef.copilotUrl`: Base URL for Copilot (default `https://copilot.microsoft.com/`).
- `copilotCrossRef.openInSimpleBrowser`: Open inside VS Code Simple Browser.
- `copilotCrossRef.prefillQueryInUrl`: Best-effort prefill via URL param (off by default).
- `copilotCrossRef.promptTemplate`: Template for the prompt. Use `{{text}}`.
- `copilotCrossRef.copyPromptToClipboard`: Copy prompt to clipboard (on by default).

## Run & debug

1. `npm install`
2. Press `F5` in VS Code to launch the Extension Development Host.
3. In the new window, open the Command Palette and run one of the commands above.
