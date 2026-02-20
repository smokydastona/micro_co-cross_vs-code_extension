import * as vscode from 'vscode';
import { getBrokerConfig } from '../config/settings';
import { createAdapter } from '../models/factory';
import { Transcript } from '../broker/Transcript';
import { TurnEngine } from '../broker/TurnEngine';
import { ConversationBroker } from '../broker/ConversationBroker';
import { TranscriptPanel } from '../ui/TranscriptPanel';
import { logError, logInfo } from '../util/logging';
import type { ProviderId } from '../config/settings';
import { getSecret, OPENAI_KEY_SECRET } from '../config/secrets';

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

      // Prefer local models if the user has not explicitly configured broker providers.
      const brokerProvidersExplicit = areBrokerProvidersExplicitlyConfigured();

      const cfg = getBrokerConfig();

      let modelAConfig = cfg.modelA;
      let modelBConfig = cfg.modelB;

      if (!brokerProvidersExplicit) {
        const detected = await detectLocalCandidates();
        if (detected.length > 0) {
          const a = detected[0];
          const b = detected[1] ?? detected[0];

          modelAConfig = {
            provider: a.provider,
            baseUrl: a.baseUrl,
            model: a.model,
            systemPrompt: cfg.modelA.systemPrompt
          };

          modelBConfig = {
            provider: b.provider,
            baseUrl: b.baseUrl,
            model: b.model,
            systemPrompt: cfg.modelB.systemPrompt
          };

          logInfo(
            `Auto-detected local models: A=${modelAConfig.provider}/${modelAConfig.model} (${modelAConfig.baseUrl}), B=${modelBConfig.provider}/${modelBConfig.model} (${modelBConfig.baseUrl})`
          );
        } else {
          const choice = await vscode.window.showWarningMessage(
            'No local AI model endpoint detected (LM Studio or Ollama). What do you want to do?',
            'Open Broker Settings',
            'Use ChatGPT',
            'Cancel'
          );

          if (!choice || choice === 'Cancel') {
            return;
          }

          if (choice === 'Open Broker Settings') {
            await vscode.commands.executeCommand('workbench.action.openSettings', 'copilotCrossRef.broker');
            return;
          }

          // Use ChatGPT for both A and B for this session.
          const key = await getSecret(context, OPENAI_KEY_SECRET);
          if (!key) {
            const setChoice = await vscode.window.showInformationMessage(
              'ChatGPT requires an OpenAI API key. Set it now?',
              'Set OpenAI API Key',
              'Cancel'
            );

            if (setChoice !== 'Set OpenAI API Key') {
              return;
            }
            await vscode.commands.executeCommand('copilotCrossRef.setOpenAIApiKey');
          }

          modelAConfig = {
            provider: 'chatgpt',
            model: cfg.modelA.model,
            baseUrl: cfg.modelA.baseUrl,
            systemPrompt: cfg.modelA.systemPrompt
          };

          modelBConfig = {
            provider: 'chatgpt',
            model: cfg.modelA.model,
            baseUrl: cfg.modelA.baseUrl,
            systemPrompt: cfg.modelB.systemPrompt
          };
        }
      }

      const initialPrompt = await vscode.window.showInputBox({
        title: 'Start Conversation',
        prompt: 'Enter the initial prompt for Model A and Model B to discuss',
        ignoreFocusOut: true
      });
      if (!initialPrompt) {
        return;
      }

      const azureApiVersion = vscode.workspace.getConfiguration('copilotCrossRef').get<string>(
        'broker.azureApiVersion',
        '2024-02-15-preview'
      );

      const [modelA, modelB] = await Promise.all([
        createAdapter(context, modelAConfig, { azureApiVersion }),
        createAdapter(context, modelBConfig, { azureApiVersion })
      ]);

      const transcript = new Transcript();
      const engine = new TurnEngine({ maxTurns: cfg.maxTurns, stopCondition: cfg.stopCondition });
      const broker = new ConversationBroker(modelA, modelB, transcript, engine, {
        systemA: modelAConfig.systemPrompt,
        systemB: modelBConfig.systemPrompt
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

      // Also show the actual adapters chosen for this run in the transcript status.
      transcript.status(`Using: A=${modelAConfig.provider}/${modelAConfig.model}, B=${modelBConfig.provider}/${modelBConfig.model}`);

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

function areBrokerProvidersExplicitlyConfigured(): boolean {
  const c = vscode.workspace.getConfiguration('copilotCrossRef');
  const a = c.inspect<ProviderId>('broker.modelA.provider');
  const b = c.inspect<ProviderId>('broker.modelB.provider');
  const aExplicit = a?.workspaceValue !== undefined || a?.globalValue !== undefined;
  const bExplicit = b?.workspaceValue !== undefined || b?.globalValue !== undefined;
  return aExplicit || bExplicit;
}

type LocalCandidate = {
  provider: Extract<ProviderId, 'lmstudio' | 'ollama'>;
  baseUrl: string;
  model: string;
};

async function detectLocalCandidates(): Promise<LocalCandidate[]> {
  const candidates: LocalCandidate[] = [];

  // LM Studio (OpenAI-compatible)
  const lmBaseUrl = 'http://localhost:1234/v1';
  const lmModels = await tryListModelsOpenAICompatible(lmBaseUrl);
  if (lmModels && lmModels.length > 0) {
    candidates.push({ provider: 'lmstudio', baseUrl: lmBaseUrl, model: lmModels[0] });
  }

  // Ollama (OpenAI-compatible in recent versions; fallback to /api/tags)
  const ollamaBaseUrl = 'http://localhost:11434/v1';
  const ollamaModels = (await tryListModelsOpenAICompatible(ollamaBaseUrl)) ?? (await tryListModelsOllamaTags());
  if (ollamaModels && ollamaModels.length > 0) {
    candidates.push({ provider: 'ollama', baseUrl: ollamaBaseUrl, model: ollamaModels[0] });
  }

  return candidates;
}

async function tryListModelsOpenAICompatible(baseUrl: string): Promise<string[] | undefined> {
  const url = `${baseUrl.replace(/\/$/, '')}/models`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 600);

    const res = await fetch(url, { method: 'GET', signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      return undefined;
    }

    const json = (await res.json()) as any;
    const data = json?.data;
    if (!Array.isArray(data)) {
      return undefined;
    }

    const models = data
      .map((x: any) => x?.id)
      .filter((x: any) => typeof x === 'string' && x.length > 0) as string[];

    return models.length ? models : undefined;
  } catch {
    return undefined;
  }
}

async function tryListModelsOllamaTags(): Promise<string[] | undefined> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 600);

    const res = await fetch('http://localhost:11434/api/tags', { method: 'GET', signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      return undefined;
    }

    const json = (await res.json()) as any;
    const models = json?.models;
    if (!Array.isArray(models)) {
      return undefined;
    }

    const names = models
      .map((m: any) => m?.name)
      .filter((x: any) => typeof x === 'string' && x.length > 0) as string[];

    return names.length ? names : undefined;
  } catch {
    return undefined;
  }
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError';
}
