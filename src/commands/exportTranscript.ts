import * as vscode from 'vscode';
import { getActiveConversation } from './startConversation';

function toMarkdown(entries: { speaker: string; content: string; timestamp: number }[]): string {
  const lines: string[] = ['# Transcript', ''];
  for (const e of entries) {
    const time = new Date(e.timestamp).toISOString();
    lines.push(`## ${e.speaker} (${time})`, '', e.content, '');
  }
  return lines.join('\n');
}

export function registerExportTranscript(): vscode.Disposable {
  return vscode.commands.registerCommand('micro.exportTranscript', async () => {
    const active = getActiveConversation();
    if (!active) {
      vscode.window.showErrorMessage('No active transcript to export. Start a conversation first.');
      return;
    }

    const uri = await vscode.window.showSaveDialog({
      title: 'Export Transcript',
      filters: {
        Markdown: ['md'],
        JSON: ['json']
      }
    });

    if (!uri) {
      return;
    }

    const entries = active.transcript.getAll();

    let content = '';
    if (uri.fsPath.toLowerCase().endsWith('.json')) {
      content = JSON.stringify(entries, null, 2);
    } else {
      content = toMarkdown(entries);
    }

    await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
    vscode.window.showInformationMessage(`Transcript exported: ${uri.fsPath}`);
  });
}
