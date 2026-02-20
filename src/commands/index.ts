import * as vscode from 'vscode';
import { registerStartConversation } from './startConversation';
import { registerStopConversation } from './stopConversation';
import { registerExportTranscript } from './exportTranscript';
import { registerSendToModelA } from './sendToModelA';
import { registerSendToModelB } from './sendToModelB';

export function registerConversationCommands(context: vscode.ExtensionContext): vscode.Disposable[] {
  return [
    registerStartConversation(context),
    registerStopConversation(),
    registerSendToModelA(),
    registerSendToModelB(),
    registerExportTranscript()
  ];
}
