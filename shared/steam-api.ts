// The wishlist scan. Steam's endpoints used here are undocumented and may change.
import { catalogTitles, chunk, type PassId } from "./catalogs";
import { labelOf, type ScanOptions, type SourceId } from "./sources";
import { normalizeTitle } from "./titles";

const API = "https://api.steampowered.com";

export interface Game {
  appid: number;
  name: string;
}

export interface WishlistItem {
  appid: number;
}

export interface SharedApp {
  appid: number;
  name?: string;
  owner_steamids?: string[];
  exclude_reason?: number;
}

export interface Match extends Game {
  reasons: SourceId[];
}

export interface ScanResult {
  wishlistCount: number;
  matches: Match[];
  warnings: string[]; // sources that couldn't be checked
}

const NAMES_PER_REQUEST = 50;

/** The part of `fetch` this module needs, so each platform can supply its own. */
export type FetchLike = (
  url: string,
) => Promise<{ ok: boolean; status: number; json(): Promise<any> }>;

/** The web access token is a JWT whose "sub" claim is the signed-in user's SteamID64. */
export function steamIdFromToken(token: string): string {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const { sub } = JSON.parse(atob(payload));
    if (/^\d+$/.test(sub)) return sub;
  } catch {
    // fall through to the shared error
  }
  throw new Error("Steam returned a sign-in token this tool can't read.");
}

/**
 * Wishlisted games that another family member shares with you.
 * Anything you own yourself, or that is excluded from sharing, is left out.
 */
export function findSharedWishlistGames(
  wishlist: WishlistItem[],
  sharedApps: SharedApp[],
  mySteamId: string,
): Game[] {
  const wished = new Set(wishlist.map((item) => item.appid));
  const matches = new Map<number, Game>();
  for (const app of sharedApps) {
    if (!wished.has(app.appid)) continue;
    if (app.exclude_reason) continue; // 0 or absent means playable
    const owners = app.owner_steamids ?? [];
    if (owners.length === 0 || owners.includes(mySteamId)) continue;
    matches.set(app.appid, { appid: app.appid, name: app.name || `App ${app.appid}` });
  }
  return [...matches.values()].sort((a, b) => a.name.localeCompare(b.name));
}

async function get(method: string, params: Record<string, string>, fetchFn: FetchLike) {
  const url = `${API}/${method}/v1/?${new URLSearchParams(params)}`;
  const res = await fetchFn(url);
  // Never put the URL in an error message: it contains the access token.
  if (!res.ok) throw new Error(`Steam request ${method} failed (HTTP ${res.status}).`);
  const body = await res.json();
  if (!body.response) throw new Error(`Steam request ${method} returned no data.`);
  return body.response;
}

async function familyGames(
  token: string,
  steamid: string,
  wishlist: WishlistItem[],
  fetchFn: FetchLike,
): Promise<Game[]> {
  const family = await get(
    "IFamilyGroupsService/GetFamilyGroupForUser",
    { access_token: token, steamid },
    fetchFn,
  );
  if (family.is_not_member_of_any_group || !family.family_groupid) {
    throw new Error("This account isn't in a Steam Family.");
  }
  const library = await get(
    "IFamilyGroupsService/GetSharedLibraryApps",
    {
      access_token: token,
      family_groupid: family.family_groupid,
      steamid,
      include_own: "false",
      include_excluded: "false",
      include_non_games: "true",
      max_apps: "50000",
    },
    fetchFn,
  );
  return findSharedWishlistGames(wishlist, library.apps ?? [], steamid);
}

/** Names of wishlisted apps, needed to look them up in other stores' catalogs. */
async function wishlistNames(
  wishlist: WishlistItem[],
  country: string,
  fetchFn: FetchLike,
): Promise<Game[]> {
  const games: Game[] = [];
  for (const batch of chunk(wishlist, NAMES_PER_REQUEST)) {
    const reply = await get(
      "IStoreBrowseService/GetItems",
      {
        input_json: JSON.stringify({
          ids: batch.map(({ appid }) => ({ appid })),
          context: { language: "english", country_code: country },
        }),
      },
      fetchFn,
    );
    for (const item of reply.store_items ?? []) {
      if (item.appid && item.name) games.push({ appid: item.appid, name: item.name });
    }
  }
  return games;
}

export function findCatalogGames(games: Game[], titles: string[]): Game[] {
  const catalog = new Set(titles.map(normalizeTitle));
  catalog.delete("");
  return games.filter((game) => catalog.has(normalizeTitle(game.name)));
}

export async function scan(
  token: string,
  fetchFn: FetchLike,
  { sources, country }: ScanOptions,
): Promise<ScanResult> {
  if (sources.length === 0) throw new Error("Choose at least one thing to check against.");
  const steamid = steamIdFromToken(token);
  const response = await get(
    "IWishlistService/GetWishlist",
    { access_token: token, steamid },
    fetchFn,
  );
  const wishlist: WishlistItem[] = response.items ?? [];

  let names: Promise<Game[]> | undefined; // fetched once, and only if a catalog needs it
  const check = async (source: SourceId) => {
    if (source === "family") return familyGames(token, steamid, wishlist, fetchFn);
    names ??= wishlistNames(wishlist, country, fetchFn);
    const [games, titles] = await Promise.all([
      names,
      catalogTitles(source as PassId, country, fetchFn),
    ]);
    return findCatalogGames(games, titles);
  };

  const outcomes = await Promise.allSettled(sources.map(check));
  const matches = new Map<number, Match>();
  const warnings: string[] = [];
  outcomes.forEach((outcome, i) => {
    const source = sources[i];
    if (outcome.status === "rejected") {
      warnings.push(`Couldn't check ${labelOf(source)}: ${outcome.reason?.message}`);
      return;
    }
    for (const game of outcome.value) {
      const match = matches.get(game.appid) ?? { ...game, reasons: [] };
      match.reasons.push(source);
      matches.set(game.appid, match);
    }
  });
  if (warnings.length === sources.length) throw new Error(warnings.join(" "));

  return {
    wishlistCount: wishlist.length,
    matches: [...matches.values()].sort((a, b) => a.name.localeCompare(b.name)),
    warnings,
  };
}

export const describeScan = ({ matches, wishlistCount, warnings }: ScanResult) =>
  [`${matches.length} of ${wishlistCount} wishlisted games matched.`, ...warnings].join(" ");
