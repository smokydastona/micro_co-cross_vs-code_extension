import type { ChatMessage } from '../util/types';

export type SendOptions = {
  stream?: boolean;
  signal?: AbortSignal;
};

export interface ModelAdapter {
  readonly name: string;

  sendMessage(messages: ChatMessage[], options?: SendOptions): AsyncGenerator<string>;
}
