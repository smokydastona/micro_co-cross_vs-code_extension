import * as vscode from 'vscode';
import type { ModelConfig } from '../config/settings';
import { getSecret, AZURE_OPENAI_KEY_SECRET, DEEPSEEK_KEY_SECRET, OPENAI_KEY_SECRET } from '../config/secrets';
import { ChatGPTAdapter } from './ChatGPTAdapter';
import { LMStudioAdapter } from './LMStudioAdapter';
import { OllamaAdapter } from './OllamaAdapter';
import { DeepSeekAdapter } from './DeepSeekAdapter';
import { AzureOpenAIAdapter } from './AzureOpenAIAdapter';
import type { ModelAdapter } from './ModelAdapter';

export async function createAdapter(
  context: vscode.ExtensionContext,
  cfg: ModelConfig,
  opts: { azureApiVersion: string }
): Promise<ModelAdapter> {
  switch (cfg.provider) {
    case 'chatgpt': {
      const apiKey = await getSecret(context, OPENAI_KEY_SECRET);
      if (!apiKey) {
        throw new Error('OpenAI API key not set. Run “Copilot Cross-Reference: Set OpenAI API Key”.');
      }
      return new ChatGPTAdapter({ apiKey, baseUrl: cfg.baseUrl, model: cfg.model });
    }
    case 'lmstudio':
      return new LMStudioAdapter({ baseUrl: cfg.baseUrl, model: cfg.model });
    case 'ollama':
      return new OllamaAdapter({ baseUrl: cfg.baseUrl, model: cfg.model });
    case 'deepseek': {
      const apiKey = await getSecret(context, DEEPSEEK_KEY_SECRET);
      if (!apiKey) {
        throw new Error('DeepSeek API key not set in Secret Storage.');
      }
      return new DeepSeekAdapter({ apiKey, baseUrl: cfg.baseUrl, model: cfg.model });
    }
    case 'azureOpenai': {
      const apiKey = await getSecret(context, AZURE_OPENAI_KEY_SECRET);
      if (!apiKey) {
        throw new Error('Azure OpenAI API key not set in Secret Storage.');
      }
      // For Azure we treat cfg.baseUrl as the endpoint and cfg.model as the deployment name.
      return new AzureOpenAIAdapter({
        endpoint: cfg.baseUrl,
        deployment: cfg.model,
        apiKey,
        apiVersion: opts.azureApiVersion
      });
    }
    default:
      throw new Error(`Unsupported provider: ${cfg.provider}`);
  }
}
