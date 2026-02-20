import * as vscode from 'vscode';
import { abortActiveRun, getActiveConversation } from './startConversation';

export function registerStopConversation(): vscode.Disposable {
  return vscode.commands.registerCommand('micro.stopConversation', async () => {
    if (!getActiveConversation()) {
      vscode.window.showErrorMessage('No active conversation to stop.');
      return;
    }
    await abortActiveRun();
    vscode.window.showInformationMessage('Conversation stopped (transcript kept open).');
  });
}
