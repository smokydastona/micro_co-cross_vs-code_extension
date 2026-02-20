import * as vscode from 'vscode';
import type { TranscriptEvent } from '../util/types';
import { Transcript } from '../broker/Transcript';

export class TranscriptPanel {
  private panel: vscode.WebviewPanel;

  private constructor(panel: vscode.WebviewPanel) {
    this.panel = panel;
  }

  static create(context: vscode.ExtensionContext): TranscriptPanel {
    const panel = vscode.window.createWebviewPanel(
      'microCoCross.transcript',
      'Micro Co-Cross Transcript',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')]
      }
    );

    const instance = new TranscriptPanel(panel);
    instance.setHtml(context);
    return instance;
  }

  onMessage(handler: (msg: any) => void): vscode.Disposable {
    return this.panel.webview.onDidReceiveMessage(handler);
  }

  reveal(): void {
    this.panel.reveal(vscode.ViewColumn.Beside);
  }

  dispose(): void {
    this.panel.dispose();
  }

  postEvent(event: TranscriptEvent): void {
    void this.panel.webview.postMessage(event);
  }

  bindTranscript(transcript: Transcript): vscode.Disposable {
    const listener = (e: TranscriptEvent) => this.postEvent(e);
    transcript.on('event', listener);
    return new vscode.Disposable(() => transcript.off('event', listener));
  }

  private setHtml(context: vscode.ExtensionContext): void {
    const webview = this.panel.webview;
    const htmlUri = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'panel.html'));
    const jsUri = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'panel.js'));
    const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'styles.css'));

    // Load html as a template but inject URIs.
    this.panel.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="${cssUri}" />
  <title>Transcript</title>
</head>
<body>
  <header class="toolbar">
    <div class="title">Micro Co-Cross Transcript</div>
    <button id="stopBtn" class="btn">Stop</button>
  </header>
  <div id="status" class="status"></div>
  <div id="transcript" class="transcript"></div>

  <script>const vscode = acquireVsCodeApi();</script>
  <script src="${jsUri}"></script>
</body>
</html>`;
  }
}
