import { OpenAICompatibleAdapter } from './OpenAICompatibleAdapter';

export class OllamaAdapter extends OpenAICompatibleAdapter {
  constructor(opts: { baseUrl?: string; model: string }) {
    super({
      name: 'ollama',
      baseUrl: opts.baseUrl ?? 'http://localhost:11434/v1',
      model: opts.model,
      auth: { kind: 'none' }
    });
  }
}
