// What the wishlist can be checked against.
export const SOURCES = [
  { id: "family", label: "Steam Family" },
  { id: "pcGamePass", label: "PC Game Pass" },
  { id: "consoleGamePass", label: "Console Game Pass" },
  { id: "psPlus", label: "PS Plus Game Catalog" },
  { id: "psClassics", label: "PS Plus Classics" },
] as const;

export type SourceId = (typeof SOURCES)[number]["id"];

export interface ScanOptions {
  sources: SourceId[];
  country: string; // two-letter code; subscription catalogs differ by country
}

export const labelOf = (id: SourceId) => SOURCES.find((source) => source.id === id)!.label;

/** Turns stored or user-typed settings into valid ones. */
export function toOptions(value?: { sources?: unknown; country?: unknown } | null): ScanOptions {
  const wanted = value?.sources;
  const sources: SourceId[] = Array.isArray(wanted)
    ? SOURCES.map((source) => source.id).filter((id) => wanted.includes(id))
    : ["family"];
  const country = String(value?.country ?? "").trim().toUpperCase();
  return { sources, country: /^[A-Z]{2}$/.test(country) ? country : "US" };
}
