import * as vscode from 'vscode';
import { buildPrompt, buildPromptFromSelection, getConfig, getCopilotBaseUrl, getCopilotUrlWithQuery, guideWindowsCopilot, openCopilot } from './copilot';
import { askChatGPT, clearOpenAIApiKey, debateChatGPTUntilChecklistEmpty, getOpenAIApiKey, setOpenAIApiKey } from './openaiChat';
import { showTextPanel } from './webview';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('copilotCrossRef.setOpenAIApiKey', async () => {
      const apiKey = await vscode.window.showInputBox({
        title: 'Set OpenAI API Key',
        prompt: 'Enter your OpenAI API key (stored in VS Code Secret Storage)',
        password: true,
        ignoreFocusOut: true
      });

      if (!apiKey) {
        return;
      }

      await setOpenAIApiKey(context, apiKey.trim());
      vscode.window.showInformationMessage('OpenAI API key saved.');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('copilotCrossRef.clearOpenAIApiKey', async () => {
      await clearOpenAIApiKey(context);
      vscode.window.showInformationMessage('OpenAI API key cleared.');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('copilotCrossRef.debateSelection', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor found.');
        return;
      }

      const selectionText = editor.document.getText(editor.selection).trim();
      if (!selectionText) {
        vscode.window.showErrorMessage('No text selected. Select text to debate.');
        return;
      }

      const config = getConfig();
      const apiKey = await getOpenAIApiKey(context);
      if (!apiKey) {
        vscode.window.showErrorMessage('OpenAI API key not set. Run “Copilot Cross-Reference: Set OpenAI API Key” first.');
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Debating in ChatGPT (${config.openaiModel})…`
        },
        async () => {
          const { report, rounds, stoppedBecause } = await debateChatGPTUntilChecklistEmpty({
            apiKey,
            baseUrl: config.openaiBaseUrl,
            model: config.openaiModel,
            topicText: selectionText,
            maxRounds: config.debateMaxRounds
          });
          const suffix = stoppedBecause === 'checklist-empty' ? `(${rounds} rounds, done)` : `(${rounds} rounds, max)`;
          showTextPanel({ title: `ChatGPT Debate ${suffix}`, bodyText: report });
        }
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('copilotCrossRef.debatePrompt', async () => {
      const config = getConfig();
      const apiKey = await getOpenAIApiKey(context);
      if (!apiKey) {
        vscode.window.showErrorMessage('OpenAI API key not set. Run “Copilot Cross-Reference: Set OpenAI API Key” first.');
        return;
      }

      const text = await vscode.window.showInputBox({
        title: 'Debate in ChatGPT',
        prompt: 'Enter the text/idea you want Critic and Builder to debate',
        ignoreFocusOut: true
      });

      if (text === undefined) {
        return;
      }

      const topicText = text.trim();
      if (!topicText) {
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Debating in ChatGPT (${config.openaiModel})…`
        },
        async () => {
          const { report, rounds, stoppedBecause } = await debateChatGPTUntilChecklistEmpty({
            apiKey,
            baseUrl: config.openaiBaseUrl,
            model: config.openaiModel,
            topicText,
            maxRounds: config.debateMaxRounds
          });
          const suffix = stoppedBecause === 'checklist-empty' ? `(${rounds} rounds, done)` : `(${rounds} rounds, max)`;
          showTextPanel({ title: `ChatGPT Debate ${suffix}`, bodyText: report });
        }
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('copilotCrossRef.open', async () => {
      const config = getConfig();
      if (config.target === 'chatgpt') {
        vscode.window.showInformationMessage('ChatGPT target does not have a homepage to open. Use an “Ask …” command instead.');
        return;
      }
      if (config.target === 'windows') {
        await guideWindowsCopilot(false);
        return;
      }

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

      if (config.target === 'chatgpt') {
        const apiKey = await getOpenAIApiKey(context);
        if (!apiKey) {
          vscode.window.showErrorMessage('OpenAI API key not set. Run “Copilot Cross-Reference: Set OpenAI API Key” first.');
          return;
        }

        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `Asking ChatGPT (${config.openaiModel})…`
          },
          async () => {
            const answer = await askChatGPT({
              apiKey,
              baseUrl: config.openaiBaseUrl,
              model: config.openaiModel,
              prompt
            });
            showTextPanel({ title: 'ChatGPT Cross-Reference', bodyText: answer });
          }
        );

        return;
      }

      if (config.target === 'windows') {
        await guideWindowsCopilot(config.copyPromptToClipboard);
        return;
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

      if (config.target === 'chatgpt') {
        const apiKey = await getOpenAIApiKey(context);
        if (!apiKey) {
          vscode.window.showErrorMessage('OpenAI API key not set. Run “Copilot Cross-Reference: Set OpenAI API Key” first.');
          return;
        }

        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `Asking ChatGPT (${config.openaiModel})…`
          },
          async () => {
            const answer = await askChatGPT({
              apiKey,
              baseUrl: config.openaiBaseUrl,
              model: config.openaiModel,
              prompt
            });
            showTextPanel({ title: 'ChatGPT Cross-Reference', bodyText: answer });
          }
        );

        return;
      }

      if (config.target === 'windows') {
        await guideWindowsCopilot(config.copyPromptToClipboard);
        return;
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
