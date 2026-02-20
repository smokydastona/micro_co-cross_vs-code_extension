import * as vscode from 'vscode';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function showTextPanel(opts: { title: string; bodyText: string }): void {
  const panel = vscode.window.createWebviewPanel(
    'copilotCrossRef.result',
    opts.title,
    vscode.ViewColumn.Beside,
    { enableFindWidget: true }
  );

  const safe = escapeHtml(opts.bodyText);
  panel.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(opts.title)}</title>
  <style>
    body { font-family: var(--vscode-font-family); color: var(--vscode-editor-foreground); background: var(--vscode-editor-background); padding: 16px; }
    pre { white-space: pre-wrap; word-wrap: break-word; font-family: var(--vscode-editor-font-family); font-size: var(--vscode-editor-font-size); line-height: 1.4; }
  </style>
</head>
<body>
  <pre>${safe}</pre>
</body>
</html>`;
}
