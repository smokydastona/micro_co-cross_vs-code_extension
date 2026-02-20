import { OpenAICompatibleAdapter } from './OpenAICompatibleAdapter';

export class LMStudioAdapter extends OpenAICompatibleAdapter {
  constructor(opts: { baseUrl?: string; model: string }) {
    super({
      name: 'lmstudio',
      baseUrl: opts.baseUrl ?? 'http://localhost:1234/v1',
      model: opts.model,
      auth: { kind: 'none' }
    });
  }
}
