import * as vscode from 'vscode';

export type ProviderId = 'chatgpt' | 'azureOpenai' | 'lmstudio' | 'ollama' | 'deepseek';

export type ModelConfig = {
  provider: ProviderId;
  model: string;
  baseUrl: string;
  systemPrompt: string;
};

export type BrokerConfig = {
  modelA: ModelConfig;
  modelB: ModelConfig;
  maxTurns: number;
  stopCondition: 'maxTurns' | 'checklistEmpty';
};

function cfg() {
  return vscode.workspace.getConfiguration('copilotCrossRef');
}

export function getBrokerConfig(): BrokerConfig {
  const c = cfg();

  const modelAProvider = c.get<ProviderId>('broker.modelA.provider', 'chatgpt');
  const modelBProvider = c.get<ProviderId>('broker.modelB.provider', 'lmstudio');

  return {
    modelA: {
      provider: modelAProvider,
      model: c.get<string>('broker.modelA.model', 'gpt-4.1'),
      baseUrl: c.get<string>('broker.modelA.baseUrl', 'https://api.openai.com/v1'),
      systemPrompt: c.get<string>('broker.modelA.systemPrompt', 'You are Speaker A. Be precise and critical when needed.')
    },
    modelB: {
      provider: modelBProvider,
      model: c.get<string>('broker.modelB.model', 'local-model'),
      baseUrl: c.get<string>('broker.modelB.baseUrl', 'http://localhost:1234/v1'),
      systemPrompt: c.get<string>('broker.modelB.systemPrompt', 'You are Speaker B. Be constructive and propose improvements.')
    },
    maxTurns: c.get<number>('broker.maxTurns', 8),
    stopCondition: c.get<'maxTurns' | 'checklistEmpty'>('broker.stopCondition', 'maxTurns')
  };
}
