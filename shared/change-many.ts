import type { Game } from "./steam-api";

export type WishlistAction = "removefromwishlist" | "addtowishlist";

const DELAY_MS = 500; // pause between wishlist changes, to stay clear of rate limits
const MAX_FAILURES_IN_A_ROW = 3;

/** Applies one change to many games and returns the ones that succeeded. */
export async function changeMany(
  games: Game[],
  change: (game: Game) => Promise<boolean>,
  onProgress: (game: Game, index: number) => void,
  sleep = (ms: number) => new Promise<unknown>((resolve) => setTimeout(resolve, ms)),
): Promise<Game[]> {
  const done: Game[] = [];
  let failuresInARow = 0;
  for (const [index, game] of games.entries()) {
    onProgress(game, index);
    const ok = await change(game).catch(() => false);
    if (ok) done.push(game);
    failuresInARow = ok ? 0 : failuresInARow + 1;
    if (failuresInARow >= MAX_FAILURES_IN_A_ROW) break;
    if (index < games.length - 1) await sleep(DELAY_MS);
  }
  return done;
}
