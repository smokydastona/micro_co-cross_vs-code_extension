import * as vscode from 'vscode';
import OpenAI from 'openai';

export const OPENAI_KEY_SECRET = 'copilotCrossRef.openaiApiKey';

export type OpenAIConfig = {
  baseUrl: string;
  model: string;
};

export async function getOpenAIApiKey(context: vscode.ExtensionContext): Promise<string | undefined> {
  return context.secrets.get(OPENAI_KEY_SECRET);
}

export async function setOpenAIApiKey(context: vscode.ExtensionContext, apiKey: string): Promise<void> {
  await context.secrets.store(OPENAI_KEY_SECRET, apiKey);
}

export async function clearOpenAIApiKey(context: vscode.ExtensionContext): Promise<void> {
  await context.secrets.delete(OPENAI_KEY_SECRET);
}

export function createOpenAIClient(apiKey: string, baseUrl: string): OpenAI {
  // The OpenAI SDK expects baseURL without trailing slash issues; it tolerates both.
  return new OpenAI({ apiKey, baseURL: baseUrl });
}

export async function askChatGPT(opts: {
  apiKey: string;
  baseUrl: string;
  model: string;
  prompt: string;
}): Promise<string> {
  const client = createOpenAIClient(opts.apiKey, opts.baseUrl);

  const response = await client.responses.create({
    model: opts.model,
    input: opts.prompt
  });

  const text = response.output_text;
  if (!text || !text.trim()) {
    return '(No text output returned.)';
  }
  return text.trim();
}

export async function debateChatGPT(opts: {
  apiKey: string;
  baseUrl: string;
  model: string;
  topicText: string;
}): Promise<{ critic: string; builder: string; report: string }> {
  const client = createOpenAIClient(opts.apiKey, opts.baseUrl);
  const topic = opts.topicText.trim();

  const criticPrompt = [
    'You are Critic. Your job is to find flaws, missing context, incorrect assumptions, security risks, edge cases, and better alternatives.',
    'Be direct and specific. Use short bullets. If code is present, call out likely bugs and improvements.',
    '',
    'CONTENT TO REVIEW:',
    topic
  ].join('\n');

  const criticResp = await client.responses.create({
    model: opts.model,
    input: criticPrompt
  });

  const critic = (criticResp.output_text || '').trim() || '(No critic output returned.)';

  const builderPrompt = [
    'You are Builder. Your job is to produce an improved version, incorporating Critic feedback where appropriate.',
    'Output structure:',
    '1) Improved Answer (or Improved Code/Plan)',
    '2) Action Items (checklist)',
    '3) Risks / Tradeoffs',
    '',
    'ORIGINAL CONTENT:',
    topic,
    '',
    'CRITIC FEEDBACK:',
    critic
  ].join('\n');

  const builderResp = await client.responses.create({
    model: opts.model,
    input: builderPrompt
  });

  const builder = (builderResp.output_text || '').trim() || '(No builder output returned.)';

  const report = [
    '=== Critic ===',
    critic,
    '',
    '=== Builder ===',
    builder
  ].join('\n');

  return { critic, builder, report };
}

function countOpenChecklistItems(text: string): number {
  // Count unchecked markdown task items like: - [ ] item
  // We intentionally treat any unchecked task as still open.
  const matches = text.match(/^\s*[-*]\s*\[\s*\]\s+.+$/gim);
  return matches?.length ?? 0;
}

export async function debateChatGPTUntilChecklistEmpty(opts: {
  apiKey: string;
  baseUrl: string;
  model: string;
  topicText: string;
  maxRounds: number;
}): Promise<{ rounds: number; report: string; stoppedBecause: 'checklist-empty' | 'max-rounds' }> {
  const client = createOpenAIClient(opts.apiKey, opts.baseUrl);
  const topic = opts.topicText.trim();

  const clampMaxRounds = Math.max(1, Math.min(20, Math.floor(opts.maxRounds || 1)));

  let transcript: string[] = [];
  let lastBuilder = '';
  let stoppedBecause: 'checklist-empty' | 'max-rounds' = 'max-rounds';

  // Round 1: Critic reviews original content.
  const criticPrompt1 = [
    'You are Critic.',
    'Goal: identify issues, missing context, incorrect assumptions, edge cases, security risks, and better alternatives.',
    'Output:',
    '- Bullet list of critiques',
    '- A markdown checklist of Action Items using unchecked tasks ("- [ ]")',
    '',
    'CONTENT TO REVIEW:',
    topic
  ].join('\n');

  const critic1 = (await client.responses.create({ model: opts.model, input: criticPrompt1 })).output_text?.trim() ?? '';
  transcript.push('=== Round 1: Critic ===', critic1 || '(No critic output returned.)', '');

  // Round 1: Builder responds with improved version and checklist.
  const builderPrompt1 = [
    'You are Builder.',
    'Goal: produce an improved version that addresses Critic feedback. Be concrete and actionable.',
    'Output MUST include:',
    '1) Improved Answer (or Improved Code/Plan)',
    '2) Action Items checklist in markdown task format',
    '   - Use "- [x]" for completed items and "- [ ]" for remaining items',
    '3) Risks / Tradeoffs',
    '',
    'ORIGINAL CONTENT:',
    topic,
    '',
    'CRITIC FEEDBACK:',
    critic1
  ].join('\n');

  lastBuilder = (await client.responses.create({ model: opts.model, input: builderPrompt1 })).output_text?.trim() ?? '';
  transcript.push('=== Round 1: Builder ===', lastBuilder || '(No builder output returned.)', '');

  // Subsequent rounds: Critic checks remaining checklist items; Builder updates until none left.
  for (let round = 2; round <= clampMaxRounds; round++) {
    const openCount = countOpenChecklistItems(lastBuilder);
    if (openCount === 0) {
      stoppedBecause = 'checklist-empty';
      return { rounds: round - 1, report: transcript.join('\n'), stoppedBecause };
    }

    const criticPrompt = [
      'You are Critic.',
      'Check the Builder output for completeness and correctness.',
      'Focus specifically on the Action Items checklist:',
      '- If any "- [ ]" items remain, explain what is still missing and why.',
      '- If an item is actually completed in the text, tell Builder to mark it as "- [x]".',
      '- Add any missing action items as "- [ ]".',
      'Output:',
      '- Short critique bullets',
      '- Updated Action Items checklist',
      '',
      'BUILDER OUTPUT TO REVIEW:',
      lastBuilder
    ].join('\n');

    const critic = (await client.responses.create({ model: opts.model, input: criticPrompt })).output_text?.trim() ?? '';
    transcript.push(`=== Round ${round}: Critic ===`, critic || '(No critic output returned.)', '');

    const builderPrompt = [
      'You are Builder.',
      'Revise your output to address Critic feedback.',
      'CRITICAL: Update the Action Items checklist:',
      '- Mark items "- [x]" only when fully addressed in the revised content.',
      '- Keep "- [ ]" for remaining items.',
      'Stop leaving vague tasks; make remaining tasks as specific as possible.',
      '',
      'CURRENT BUILDER OUTPUT:',
      lastBuilder,
      '',
      'CRITIC FEEDBACK:',
      critic
    ].join('\n');

    lastBuilder = (await client.responses.create({ model: opts.model, input: builderPrompt })).output_text?.trim() ?? '';
    transcript.push(`=== Round ${round}: Builder ===`, lastBuilder || '(No builder output returned.)', '');
  }

  // Final check after max rounds.
  if (countOpenChecklistItems(lastBuilder) === 0) {
    stoppedBecause = 'checklist-empty';
  } else {
    stoppedBecause = 'max-rounds';
  }

  transcript.push(
    `=== Stopped (${stoppedBecause}) ===`,
    stoppedBecause === 'max-rounds'
      ? `Reached max rounds (${clampMaxRounds}). Increase copilotCrossRef.debateMaxRounds to keep iterating.`
      : 'Checklist is empty.'
  );

  return { rounds: clampMaxRounds, report: transcript.join('\n'), stoppedBecause };
}
