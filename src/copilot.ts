import * as vscode from 'vscode';

export type CopilotCrossRefConfig = {
  target: 'web' | 'windows' | 'chatgpt';
  openaiModel: string;
  openaiBaseUrl: string;
  debateMaxRounds: number;
  copilotUrl: string;
  openInSimpleBrowser: boolean;
  prefillQueryInUrl: boolean;
  promptTemplate: string;
  copyPromptToClipboard: boolean;
};

export function getConfig(): CopilotCrossRefConfig {
  const cfg = vscode.workspace.getConfiguration('copilotCrossRef');
  const target = cfg.get<string>('target', 'web');
  return {
    target: target === 'windows' ? 'windows' : target === 'chatgpt' ? 'chatgpt' : 'web',
    openaiModel: cfg.get<string>('openaiModel', 'gpt-4.1'),
    openaiBaseUrl: cfg.get<string>('openaiBaseUrl', 'https://api.openai.com/v1'),
    debateMaxRounds: cfg.get<number>('debateMaxRounds', 6),
    copilotUrl: cfg.get<string>('copilotUrl', 'https://copilot.microsoft.com/'),
    openInSimpleBrowser: cfg.get<boolean>('openInSimpleBrowser', true),
    prefillQueryInUrl: cfg.get<boolean>('prefillQueryInUrl', false),
    promptTemplate: cfg.get<string>(
      'promptTemplate',
      'Please cross-check the following content and point out any issues, missing context, or better alternatives.\n\n{{text}}'
    ),
    copyPromptToClipboard: cfg.get<boolean>('copyPromptToClipboard', true)
  };
}

export function buildPrompt(template: string, text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return template.replace('{{text}}', '');
  }
  return template.replace('{{text}}', trimmed);
}

export function buildPromptFromSelection(editor: vscode.TextEditor, template: string): string | undefined {
  const selection = editor.selection;
  const selectedText = editor.document.getText(selection);
  const trimmed = selectedText.trim();
  if (!trimmed) {
    return undefined;
  }
  return buildPrompt(template, trimmed);
}

export function getCopilotBaseUrl(config: CopilotCrossRefConfig): URL {
  try {
    return new URL(config.copilotUrl);
  } catch {
    return new URL('https://copilot.microsoft.com/');
  }
}

export function getCopilotUrlWithQuery(config: CopilotCrossRefConfig, prompt: string): URL {
  const url = getCopilotBaseUrl(config);
  if (!config.prefillQueryInUrl) {
    return url;
  }

  // Best-effort: Copilot's URL structure can change.
  // We keep this optional and always support clipboard copy.
  url.searchParams.set('q', prompt);
  return url;
}

export async function openCopilot(url: URL, openInSimpleBrowser: boolean): Promise<void> {
  const urlString = url.toString();

  if (openInSimpleBrowser) {
    try {
      await vscode.commands.executeCommand('simpleBrowser.show', urlString);
      return;
    } catch {
      // Fall through to external browser.
    }
  }

  await vscode.env.openExternal(vscode.Uri.parse(urlString));
}

export async function guideWindowsCopilot(promptWasCopied: boolean): Promise<void> {
  const msg = promptWasCopied
    ? 'Prompt copied. Open Windows Copilot (Win+C) and paste it.'
    : 'Open Windows Copilot (Win+C).';

  await vscode.window.showInformationMessage(msg);
}
