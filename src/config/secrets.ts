import * as vscode from 'vscode';

export const OPENAI_KEY_SECRET = 'copilotCrossRef.openaiApiKey';
export const AZURE_OPENAI_KEY_SECRET = 'copilotCrossRef.azureOpenAIApiKey';
export const DEEPSEEK_KEY_SECRET = 'copilotCrossRef.deepseekApiKey';

export async function getSecret(context: vscode.ExtensionContext, key: string): Promise<string | undefined> {
  return context.secrets.get(key);
}

export async function setSecret(context: vscode.ExtensionContext, key: string, value: string): Promise<void> {
  await context.secrets.store(key, value);
}

export async function clearSecret(context: vscode.ExtensionContext, key: string): Promise<void> {
  await context.secrets.delete(key);
}
