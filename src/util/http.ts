import { TextDecoder } from 'util';

export async function* readSseDataLines(response: Response): AsyncGenerator<string> {
  if (!response.body) {
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');

  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    // SSE events are separated by a blank line.
    let idx: number;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const rawEvent = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);

      const lines = rawEvent.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) {
          continue;
        }
        const data = trimmed.slice('data:'.length).trim();
        if (!data) {
          continue;
        }
        if (data === '[DONE]') {
          return;
        }
        yield data;
      }
    }
  }
}

export async function assertOk(response: Response, context: string): Promise<void> {
  if (response.ok) {
    return;
  }

  let bodyText = '';
  try {
    bodyText = await response.text();
  } catch {
    // ignore
  }

  const suffix = bodyText ? `\n\n${bodyText}` : '';
  throw new Error(`${context} failed: ${response.status} ${response.statusText}${suffix}`);
}
