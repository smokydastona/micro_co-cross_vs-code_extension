import * as vscode from 'vscode';
import { getActiveConversation } from './startConversation';

export function registerSendToModelA(): vscode.Disposable {
  return vscode.commands.registerCommand('micro.sendToModelA', async () => {
    const active = getActiveConversation();
    if (!active) {
      vscode.window.showErrorMessage('No active conversation. Start one first.');
      return;
    }

    const text = await vscode.window.showInputBox({
      title: 'Send to Model A',
      prompt: 'Enter a new user message to feed into the conversation, then force Model A to respond',
      ignoreFocusOut: true
    });

    if (!text) {
      return;
    }

    active.broker.addUserMessage(text);
    await active.broker.runOneTurn('A', { signal: active.abort.signal });
  });
}
