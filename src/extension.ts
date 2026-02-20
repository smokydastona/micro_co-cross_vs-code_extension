import * as vscode from 'vscode';
import { buildPrompt, buildPromptFromSelection, getConfig, getCopilotBaseUrl, getCopilotUrlWithQuery, openCopilot } from './copilot';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('copilotCrossRef.open', async () => {
      const config = getConfig();
      const url = getCopilotBaseUrl(config);
      await openCopilot(url, config.openInSimpleBrowser);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('copilotCrossRef.askSelection', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor found.');
        return;
      }

      const config = getConfig();
      const prompt = buildPromptFromSelection(editor, config.promptTemplate);
      if (!prompt) {
        vscode.window.showErrorMessage('No text selected. Select text to cross-reference, or use “Ask Microsoft Copilot (Prompt)”.');
        return;
      }

      if (config.copyPromptToClipboard) {
        await vscode.env.clipboard.writeText(prompt);
      }

      const url = getCopilotUrlWithQuery(config, prompt);
      await openCopilot(url, config.openInSimpleBrowser);

      if (config.copyPromptToClipboard) {
        vscode.window.showInformationMessage('Copilot prompt copied to clipboard. Paste it into Microsoft Copilot.');
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('copilotCrossRef.askPrompt', async () => {
      const config = getConfig();

      const text = await vscode.window.showInputBox({
        title: 'Ask Microsoft Copilot',
        prompt: 'Enter what you want Microsoft Copilot to cross-check',
        placeHolder: 'e.g. Validate this approach and suggest improvements...'
      });

      if (text === undefined) {
        return;
      }

      const prompt = buildPrompt(config.promptTemplate, text);

      if (config.copyPromptToClipboard) {
        await vscode.env.clipboard.writeText(prompt);
      }

      const url = getCopilotUrlWithQuery(config, prompt);
      await openCopilot(url, config.openInSimpleBrowser);

      if (config.copyPromptToClipboard) {
        vscode.window.showInformationMessage('Copilot prompt copied to clipboard. Paste it into Microsoft Copilot.');
      }
    })
  );
}

export function deactivate() {
  // no-op
}
