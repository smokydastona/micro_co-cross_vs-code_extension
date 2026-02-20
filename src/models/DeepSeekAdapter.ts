import { OpenAICompatibleAdapter } from './OpenAICompatibleAdapter';

export class DeepSeekAdapter extends OpenAICompatibleAdapter {
  constructor(opts: { apiKey: string; baseUrl?: string; model: string }) {
    super({
      name: 'deepseek',
      baseUrl: opts.baseUrl ?? 'https://api.deepseek.com/v1',
      model: opts.model,
      auth: { kind: 'bearer', apiKey: opts.apiKey }
    });
  }
}
