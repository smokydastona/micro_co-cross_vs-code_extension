import * as vscode from 'vscode';

let channel: vscode.OutputChannel | undefined;

export function getLogChannel(): vscode.OutputChannel {
  if (!channel) {
    channel = vscode.window.createOutputChannel('Copilot Cross-Reference');
  }
  return channel;
}

export function logInfo(message: string): void {
  const ch = getLogChannel();
  ch.appendLine(`[info] ${message}`);
}

export function logError(message: string, err?: unknown): void {
  const ch = getLogChannel();
  const details = err instanceof Error ? `${err.name}: ${err.message}` : String(err ?? '');
  ch.appendLine(`[error] ${message}${details ? ` :: ${details}` : ''}`);
}
