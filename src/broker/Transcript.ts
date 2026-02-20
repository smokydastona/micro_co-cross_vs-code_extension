import { EventEmitter } from 'events';
import type { ChatMessage, Speaker, TranscriptEntry, TranscriptEvent } from '../util/types';

let nextId = 1;

export class Transcript extends EventEmitter {
  private entries: TranscriptEntry[] = [];

  reset(): void {
    this.entries = [];
    this.emit('event', { type: 'status', text: 'Transcript cleared.' } satisfies TranscriptEvent);
  }

  getAll(): TranscriptEntry[] {
    return [...this.entries];
  }

  addUser(text: string): void {
    const entry: TranscriptEntry = {
      id: String(nextId++),
      speaker: 'user',
      content: text,
      timestamp: Date.now()
    };
    this.entries.push(entry);
    this.emit('event', { type: 'message', speaker: 'user', text } satisfies TranscriptEvent);
  }

  addAssistant(speaker: Exclude<Speaker, 'user'>, text: string): void {
    const entry: TranscriptEntry = {
      id: String(nextId++),
      speaker,
      content: text,
      timestamp: Date.now()
    };
    this.entries.push(entry);
    this.emit('event', { type: 'message', speaker, text } satisfies TranscriptEvent);
  }

  streamChunk(speaker: Exclude<Speaker, 'user'>, chunk: string): void {
    this.emit('event', { type: 'chunk', speaker, text: chunk } satisfies TranscriptEvent);
  }

  status(text: string): void {
    this.emit('event', { type: 'status', text } satisfies TranscriptEvent);
  }

  getLastAssistantText(): string | undefined {
    for (let i = this.entries.length - 1; i >= 0; i--) {
      const e = this.entries[i];
      if (e.speaker === 'A' || e.speaker === 'B') {
        return e.content;
      }
    }
    return undefined;
  }

  toChatMessagesFor(speaker: Exclude<Speaker, 'user'>, systemPrompt: string): ChatMessage[] {
    const sys = `${systemPrompt}\n\nConversation format: assistant messages are prefixed with \"A:\" or \"B:\". Respond as ${speaker} (prefix your own output with \"${speaker}:\").`;

    const result: ChatMessage[] = [{ role: 'system', content: sys }];

    for (const entry of this.entries) {
      if (entry.speaker === 'user') {
        result.push({ role: 'user', content: entry.content });
      } else {
        result.push({ role: 'assistant', content: `${entry.speaker}: ${entry.content}` });
      }
    }

    return result;
  }
}
