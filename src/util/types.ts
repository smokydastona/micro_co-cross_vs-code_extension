export type ChatRole = 'system' | 'user' | 'assistant';

export type Speaker = 'user' | 'A' | 'B';

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type TranscriptEntry = {
  id: string;
  speaker: Speaker;
  content: string;
  timestamp: number;
};

export type StreamChunkEvent = {
  type: 'chunk';
  speaker: Exclude<Speaker, 'user'>;
  text: string;
};

export type MessageEvent = {
  type: 'message';
  speaker: Speaker;
  text: string;
};

export type StatusEvent = {
  type: 'status';
  text: string;
};

export type TranscriptEvent = StreamChunkEvent | MessageEvent | StatusEvent;
