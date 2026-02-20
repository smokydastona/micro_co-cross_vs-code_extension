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
