import * as vscode from 'vscode';
import { getBrokerConfig } from '../config/settings';
import { createAdapter } from '../models/factory';
import { Transcript } from '../broker/Transcript';
import { TurnEngine } from '../broker/TurnEngine';
import { ConversationBroker } from '../broker/ConversationBroker';
import { TranscriptPanel } from '../ui/TranscriptPanel';
import { logError, logInfo } from '../util/logging';

export type ActiveConversation = {
  broker: ConversationBroker;
  transcript: Transcript;
  panel: TranscriptPanel;
  abort: AbortController;
  dispose: () => void;
};

let active: ActiveConversation | undefined;

export function getActiveConversation(): ActiveConversation | undefined {
  return active;
}

export async function abortActiveRun(): Promise<void> {
  if (!active) {
    return;
  }

  // Stop any in-flight streaming request.
  active.abort.abort();
  // Replace the controller so manual turns can run after stopping.
  active.abort = new AbortController();
  active.transcript.status('Conversation stopped.');
}

export async function disposeActiveConversation(): Promise<void> {
  if (!active) {
    return;
  }

  active.abort.abort();
  active.dispose();
  active = undefined;
}

export function registerStartConversation(context: vscode.ExtensionContext): vscode.Disposable {
  return vscode.commands.registerCommand('micro.startConversation', async () => {
    try {
      if (active) {
        const choice = await vscode.window.showWarningMessage(
          'A conversation is already running. Stop it and start a new one?',
          'Stop & Start',
          'Cancel'
        );
        if (choice !== 'Stop & Start') {
          return;
        }
        await disposeActiveConversation();
      }

      const initialPrompt = await vscode.window.showInputBox({
        title: 'Start Conversation',
        prompt: 'Enter the initial prompt for Model A and Model B to discuss',
        ignoreFocusOut: true
      });
      if (!initialPrompt) {
        return;
      }

      const cfg = getBrokerConfig();
      const azureApiVersion = vscode.workspace.getConfiguration('copilotCrossRef').get<string>(
        'broker.azureApiVersion',
        '2024-02-15-preview'
      );

      const [modelA, modelB] = await Promise.all([
        createAdapter(context, cfg.modelA, { azureApiVersion }),
        createAdapter(context, cfg.modelB, { azureApiVersion })
      ]);

      const transcript = new Transcript();
      const engine = new TurnEngine({ maxTurns: cfg.maxTurns, stopCondition: cfg.stopCondition });
      const broker = new ConversationBroker(modelA, modelB, transcript, engine, {
        systemA: cfg.modelA.systemPrompt,
        systemB: cfg.modelB.systemPrompt
      });

      const panel = TranscriptPanel.create(context);
      const binding = panel.bindTranscript(transcript);
      const msgSub = panel.onMessage(async (msg) => {
        if (msg?.type === 'stop') {
          await vscode.commands.executeCommand('micro.stopConversation');
        }
      });

      const abort = new AbortController();
      active = {
        broker,
        transcript,
        panel,
        abort,
        dispose: () => {
          binding.dispose();
          msgSub.dispose();
          panel.dispose();
        }
      };

      logInfo(`Starting conversation: A=${cfg.modelA.provider}/${cfg.modelA.model}, B=${cfg.modelB.provider}/${cfg.modelB.model}`);

      void broker.start(initialPrompt, { signal: abort.signal }).catch((err) => {
        // Aborts are expected when the user presses Stop.
        if (isAbortError(err)) {
          return;
        }

        logError('Conversation failed', err);
        void vscode.window.showErrorMessage(`Conversation failed: ${err instanceof Error ? err.message : String(err)}`);
      });
    } catch (err) {
      logError('Start conversation failed', err);
      vscode.window.showErrorMessage(`Start conversation failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  });
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError';
}
