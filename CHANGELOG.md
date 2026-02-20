# Changelog

## Unreleased

- (Reserved)

## 0.0.2

- Add Conversation Broker: automated Model A ↔ Model B turn-taking with live streaming transcript panel.
- Add broker commands: start/stop, send user message to A/B, export transcript.
- Add broker settings for selecting providers (ChatGPT/Ollama/LM Studio/etc.), models, base URLs, system prompts, max turns, and stop conditions.
- Add key-management commands for Azure OpenAI and DeepSeek (stored in VS Code Secret Storage).

## 0.0.1

- Open Microsoft Copilot (web) inside VS Code.
- Send selection/prompt for cross-reference (clipboard + optional URL prefill).
- Add `chatgpt` target (OpenAI API) and show results in a VS Code panel.
- Add Debate mode (Critic → Builder), with an iterative loop that stops when the checklist is empty (bounded by `copilotCrossRef.debateMaxRounds`).
- Add onboarding prompt on startup to help users set their OpenAI API key.
- Add VSIX packaging improvements: repository metadata, MIT LICENSE, and `.vscodeignore` so the packaged VSIX stays small.
