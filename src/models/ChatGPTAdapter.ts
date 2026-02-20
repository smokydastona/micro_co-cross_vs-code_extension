import { OpenAICompatibleAdapter } from './OpenAICompatibleAdapter';

export class ChatGPTAdapter extends OpenAICompatibleAdapter {
  constructor(opts: { apiKey: string; baseUrl?: string; model: string }) {
    super({
      name: 'chatgpt',
      baseUrl: opts.baseUrl ?? 'https://api.openai.com/v1',
      model: opts.model,
      auth: { kind: 'bearer', apiKey: opts.apiKey }
    });
  }
}
