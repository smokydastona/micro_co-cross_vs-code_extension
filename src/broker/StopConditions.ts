export function countOpenChecklistItems(text: string): number {
  const matches = text.match(/^\s*[-*]\s*\[\s*\]\s+.+$/gim);
  return matches?.length ?? 0;
}

export function checklistIsEmpty(text: string): boolean {
  return countOpenChecklistItems(text) === 0;
}
