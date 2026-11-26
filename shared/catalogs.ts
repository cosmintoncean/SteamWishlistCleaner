// Public subscription catalogs. None of these is a documented API.
import type { FetchLike } from "./steam-api";
import { labelOf, type SourceId } from "./sources";

export type PassId = Exclude<SourceId, "family">;

const GAME_PASS_LISTS = {
  pcGamePass: "fdd9e2a7-0fee-49f6-ad69-4354098401ff",
  consoleGamePass: "f6f1f99f-9b49-4ccd-b3bf-4d9767a77f5e",
};
const PS_LISTS = { psPlus: "plus-games-list", psClassics: "plus-classics-list" };

const PRODUCTS_PER_REQUEST = 20;
const REQUESTS_AT_ONCE = 4;
const TIMEOUT_MS = 120_000; // long enough for requests that wait in a queue

export type Progress = (message: string) => void;

async function getJson(url: string, fetchFn: FetchLike) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  // A request that never answers must not leave the scan waiting forever.
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("No answer")), TIMEOUT_MS);
  });
  try {
    const res = await Promise.race([fetchFn(url), timeout]);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

async function gamePassTitles(
  list: string,
  country: string,
  fetchFn: FetchLike,
  onProgress: (done: number, total: number) => void,
) {
  const entries: { id?: string }[] = await getJson(
    `https://catalog.gamepass.com/sigls/v2?id=${list}&language=en-us&market=${country}`,
    fetchFn,
  );
  // The first entry describes the list itself and has no "id".
  const ids = entries.flatMap((entry) => (entry.id ? [entry.id] : []));
  const titles: string[] = [];
  let done = 0;
  for (const group of chunk(chunk(ids, PRODUCTS_PER_REQUEST), REQUESTS_AT_ONCE)) {
    const replies = await Promise.all(
      group.map((batch) =>
        getJson(
          "https://displaycatalog.mp.microsoft.com/v7.0/products?" +
            `bigIds=${batch.join(",")}&market=${country}&languages=en-us&MS-CV=DGU1mcuYo0WMMp%2BF.1` +
            "&fieldsTemplate=browse", // about a quarter of the full reply
          fetchFn,
        ),
      ),
    );
    for (const reply of replies) {
      for (const product of reply.Products ?? []) {
        const title = product.LocalizedProperties?.[0]?.ProductTitle;
        if (title) titles.push(title);
      }
    }
    done += group.flat().length;
    onProgress(done, ids.length);
  }
  return titles;
}

async function playStationTitles(list: string, country: string, fetchFn: FetchLike) {
  const code = country.toLowerCase();
  const url = (language: string) =>
    "https://www.playstation.com/bin/imagic/gameslist?" +
    `locale=${language}-${code}&categoryList=${list}`;
  // Not every country has an English page (Germany has only "de-de"). Entries on
  // local-language pages still carry the English title in "nameEn".
  const groups: { games?: { name?: string; nameEn?: string }[] }[] = await getJson(
    url("en"),
    fetchFn,
  ).catch(() => getJson(url(code), fetchFn));
  return groups
    .flatMap((group) => group.games ?? [])
    .flatMap((game) => [game.name, game.nameEn])
    .filter((name): name is string => Boolean(name));
}

export async function catalogTitles(
  source: PassId,
  country: string,
  fetchFn: FetchLike,
  onProgress: Progress = () => {},
): Promise<string[]> {
  const load =
    source === "pcGamePass" || source === "consoleGamePass"
      ? gamePassTitles(GAME_PASS_LISTS[source], country, fetchFn, (done, total) =>
          onProgress(`${labelOf(source)}: ${done} of ${total}`),
        )
      : playStationTitles(PS_LISTS[source], country, fetchFn);
  const titles = await load.catch((error: Error) => {
    throw new Error(`${error.message} for country ${country}.`);
  });
  if (titles.length === 0) throw new Error(`No games listed for country ${country}.`);
  return titles;
}
