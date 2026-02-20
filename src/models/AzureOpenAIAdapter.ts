import type { ChatMessage } from '../util/types';
import type { ModelAdapter, SendOptions } from './ModelAdapter';
import { assertOk, readSseDataLines } from '../util/http';

export class AzureOpenAIAdapter implements ModelAdapter {
  public readonly name = 'azureOpenai';

  constructor(
    private opts: {
      endpoint: string; // e.g. https://{resource}.openai.azure.com
      deployment: string;
      apiKey: string;
      apiVersion: string;
    }
  ) {}

  async *sendMessage(messages: ChatMessage[], options: SendOptions = {}): AsyncGenerator<string> {
    const stream = options.stream ?? true;

    const endpoint = this.opts.endpoint.replace(/\/$/, '');
    const url = `${endpoint}/openai/deployments/${encodeURIComponent(this.opts.deployment)}/chat/completions?api-version=${encodeURIComponent(
      this.opts.apiVersion
    )}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.opts.apiKey
      },
      body: JSON.stringify({
        messages,
        stream
      }),
      signal: options.signal
    });

    await assertOk(response, 'azureOpenai request');

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
