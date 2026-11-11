// Fixed-width number formatting for the readout, so digits never push each other around.

const MINUS = '−';
// The readout is monospaced and keeps its white space, so an ordinary space is a full digit wide.
const PAD = ' ';

export function signed(value: number, decimals: number, width: number): string {
  const sign = value < 0 ? MINUS : '+';
  return (sign + Math.abs(value).toFixed(decimals)).padStart(width, PAD);
}

export function fixed(value: number, decimals: number, width: number): string {
  return value.toFixed(decimals).padStart(width, PAD);
}

export function clock(parts: Intl.DateTimeFormatPart[]): string {
  const pick = (type: string): string => parts.find((p) => p.type === type)?.value ?? '';
  return `${pick('hour')}:${pick('minute')}:${pick('second')}`;
}

/** 2026-11-10 23:21 UTC */
export function stampUtc(date: Date): string {
  return `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}
