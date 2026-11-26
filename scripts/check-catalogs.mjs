// Live check of the public catalogs (no Steam account needed).
// Usage: node scripts/check-catalogs.mjs [country]
import { build } from "esbuild";

const { outputFiles } = await build({
  stdin: {
    contents: 'export * from "./catalogs"; export * from "./steam-api";',
    resolveDir: "shared",
  },
  bundle: true,
  format: "esm",
  write: false,
});
const { catalogTitles, findCatalogGames } = await import(
  `data:text/javascript,${encodeURIComponent(outputFiles[0].text)}`
);

const country = (process.argv[2] ?? "US").toUpperCase();
// A few well-known Steam games, looked up by name like a real wishlist.
const appids = [367520, 1551360, 1245620, 620, 1086940, 1593500, 413150, 504230, 1091500, 553850];
const input = {
  ids: appids.map((appid) => ({ appid })),
  context: { language: "english", country_code: country },
};
const reply = await fetch(
  `https://api.steampowered.com/IStoreBrowseService/GetItems/v1/?${new URLSearchParams({
    input_json: JSON.stringify(input),
  })}`,
);
const games = (await reply.json()).response.store_items.map(({ appid, name }) => ({ appid, name }));
console.log(`Steam names (${games.length}):`, games.map((game) => game.name).join(" | "));

for (const source of ["pcGamePass", "consoleGamePass", "psPlus", "psClassics"]) {
  const started = Date.now();
  try {
    const titles = await catalogTitles(source, country, (url) => fetch(url));
    const matched = findCatalogGames(games, titles).map((game) => game.name);
    console.log(
      `${source} ${country}: ${titles.length} titles in ${Date.now() - started} ms; ` +
        `matched: ${matched.join(" | ") || "none"}`,
    );
  } catch (error) {
    console.log(`${source} ${country}: FAILED ${error.message}`);
    process.exitCode = 1;
  }
}
