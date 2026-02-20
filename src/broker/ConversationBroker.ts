import type { ModelAdapter } from '../models/ModelAdapter';
import type { Speaker } from '../util/types';
import { Transcript } from './Transcript';
import { TurnEngine } from './TurnEngine';

export class ConversationBroker {
  constructor(
    private modelA: ModelAdapter,
    private modelB: ModelAdapter,
    private transcript: Transcript,
    private turnEngine: TurnEngine,
    private prompts: { systemA: string; systemB: string }
  ) {}

  async start(initialPrompt: string, opts: { signal: AbortSignal }): Promise<void> {
    let currentSpeaker: Exclude<Speaker, 'user'> = 'A';

    this.transcript.addUser(initialPrompt);

    while (!opts.signal.aborted && !this.turnEngine.shouldStop(this.transcript)) {
      await this.runOneTurn(currentSpeaker, opts);
      currentSpeaker = currentSpeaker === 'A' ? 'B' : 'A';
    }

    if (opts.signal.aborted) {
      this.transcript.status('Conversation stopped.');
    } else {
      this.transcript.status('Conversation finished.');
    }
  }

  async runOneTurn(speaker: Exclude<Speaker, 'user'>, opts: { signal: AbortSignal }): Promise<void> {
    if (opts.signal.aborted) {
      return;
    }

    const model = speaker === 'A' ? this.modelA : this.modelB;
    const systemPrompt = speaker === 'A' ? this.prompts.systemA : this.prompts.systemB;

    this.transcript.status(`Turn ${this.turnEngine.getTurnCount() + 1}: ${speaker} (${model.name})`);

    const messages = this.transcript.toChatMessagesFor(speaker, systemPrompt);

    const stream = model.sendMessage(messages, { stream: true, signal: opts.signal });

    let full = '';
    for await (const chunk of stream) {
      if (opts.signal.aborted) {
        return;
      }
      full += chunk;
      this.transcript.streamChunk(speaker, chunk);
    }

    this.transcript.addAssistant(speaker, normalizeAssistantText(full));
    this.turnEngine.incrementTurn();
  }

  addUserMessage(text: string): void {
    this.transcript.addUser(text);
  }
}

function normalizeAssistantText(text: string): string {
  let t = text.trim();

  // Models are instructed to prefix with "A:" or "B:". Strip that so we don't
  // end up with "A: A: ..." when replaying transcript into the next turn.
  t = t.replace(/^\s*(?:A|B)\s*:\s*/i, '');

  return t.trim();
}
