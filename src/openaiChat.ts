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
