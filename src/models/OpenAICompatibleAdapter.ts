import type { ChatMessage } from '../util/types';
import type { ModelAdapter, SendOptions } from './ModelAdapter';
import { assertOk, readSseDataLines } from '../util/http';

type AdapterAuth =
  | { kind: 'bearer'; apiKey: string }
  | { kind: 'header'; headerName: string; apiKey: string }
  | { kind: 'none' };

export type OpenAICompatOptions = {
  name: string;
  baseUrl: string; // e.g. https://api.openai.com/v1
  model: string;
  auth: AdapterAuth;
};

export class OpenAICompatibleAdapter implements ModelAdapter {
  public readonly name: string;
  protected readonly baseUrl: string;
  protected readonly model: string;
  protected readonly auth: AdapterAuth;

  constructor(opts: OpenAICompatOptions) {
    this.name = opts.name;
    this.baseUrl = opts.baseUrl.replace(/\/$/, '');
    this.model = opts.model;
    this.auth = opts.auth;
  }

  async *sendMessage(messages: ChatMessage[], options: SendOptions = {}): AsyncGenerator<string> {
    const stream = options.stream ?? true;

    const url = `${this.baseUrl}/chat/completions`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.auth.kind === 'bearer') {
      headers['Authorization'] = `Bearer ${this.auth.apiKey}`;
    } else if (this.auth.kind === 'header') {
      headers[this.auth.headerName] = this.auth.apiKey;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: this.model,
        messages,
        stream
      }),
      signal: options.signal
    });

    await assertOk(response, `${this.name} request`);

    if (!stream) {
      const json = (await response.json()) as any;
      const text = json?.choices?.[0]?.message?.content;
      if (typeof text === 'string' && text.length) {
        yield text;
      }
      return;
    }

    for await (const data of readSseDataLines(response)) {
      let parsed: any;
      try {
        parsed = JSON.parse(data);
      } catch {
        continue;
      }
      const delta = parsed?.choices?.[0]?.delta;
      const content = delta?.content;
      if (typeof content === 'string' && content.length) {
        yield content;
      }
    }
  }
}
