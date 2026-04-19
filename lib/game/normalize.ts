export function normalizeGuess(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
