import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";

// Bundle the shared TypeScript so it can be imported here.
const { outputFiles } = await build({
  stdin: {
    contents: ["steam-api", "change-many", "sources", "titles", "backend-reply"]
      .map((name) => `export * from "./${name}";`)
      .join(""),
    resolveDir: "shared",
  },
  bundle: true,
  format: "esm",
  write: false,
});
const {
  scan,
  steamIdFromToken,
  findSharedWishlistGames,
  changeMany,
  toOptions,
  normalizeTitle,
  backendResponse,
} = await import(`data:text/javascript,${encodeURIComponent(outputFiles[0].text)}`);

const ME = "76561190000000001";
const SIBLING = "76561190000000002";
const token = `x.${Buffer.from(JSON.stringify({ sub: ME })).toString("base64url")}.y`;

const reply = (response, status = 200) => ({
  ok: status === 200,
  status,
  json: async () => ({ response }),
});

test("reads the SteamID from the token", () => {
  assert.equal(steamIdFromToken(token), ME);
  assert.throws(() => steamIdFromToken("garbage"), /can't read/);
});

test("keeps only wishlisted games shared by someone else", () => {
  const wishlist = [1, 2, 3, 4, 5].map((appid) => ({ appid }));
  const apps = [
    { appid: 1, name: "Shared", owner_steamids: [SIBLING], exclude_reason: 0 },
    { appid: 2, name: "Excluded", owner_steamids: [SIBLING], exclude_reason: 2 },
    { appid: 3, name: "Mine too", owner_steamids: [ME, SIBLING] },
    { appid: 4, name: "No owner", owner_steamids: [] },
    { appid: 9, name: "Not wished", owner_steamids: [SIBLING] },
  ];
  assert.deepEqual(findSharedWishlistGames(wishlist, apps, ME), [{ appid: 1, name: "Shared" }]);
});

const options = (...sources) => ({ sources, country: "US" });
const raw = (body, status = 200) => ({ ok: status === 200, status, json: async () => body });

/** Fake Steam, Game Pass and PlayStation. */
const world = (overrides = {}) => async (url) => {
  for (const [part, answer] of Object.entries(overrides)) if (url.includes(part)) return answer;
  if (url.includes("GetFamilyGroupForUser")) return reply({ family_groupid: "42" });
  if (url.includes("GetWishlist")) return reply({ items: [{ appid: 1 }, { appid: 2 }, { appid: 3 }] });
  if (url.includes("GetSharedLibraryApps")) {
    assert.match(url, /family_groupid=42/);
    return reply({ apps: [{ appid: 2, name: "Bee", owner_steamids: [SIBLING] }] });
  }
  if (url.includes("GetItems")) {
    return reply({
      store_items: [
        { appid: 1, name: "Ant: Colony™" },
        { appid: 2, name: "Bee" },
        { appid: 3, name: "Cat Remastered" },
      ],
    });
  }
  if (url.includes("sigls")) return raw([{ title: "All PC Games" }, { id: "AAA" }, { id: "BBB" }]);
  if (url.includes("displaycatalog")) {
    assert.match(url, /bigIds=AAA,BBB&/);
    return raw({
      Products: ["Ant Colony (Windows)", "Cat"].map((ProductTitle) => ({
        LocalizedProperties: [{ ProductTitle }],
      })),
    });
  }
  if (url.includes("playstation.com")) {
    assert.match(url, /locale=en-us/);
    return raw([{ games: [{ name: "Bee PS4 & PS5" }] }]);
  }
  throw new Error(`unexpected request ${url}`);
};

const summary = (result) => result.matches.map((game) => [game.appid, game.reasons.join("+")]);

test("scan checks the family only when that is all that's chosen", async () => {
  const requested = [];
  const result = await scan(token, (url) => (requested.push(url), world()(url)), options("family"));
  assert.equal(result.wishlistCount, 3);
  assert.deepEqual(summary(result), [[2, "family"]]);
  assert.equal(requested.length, 3);
});

test("scan merges every chosen source", async () => {
  const result = await scan(token, world(), options("family", "pcGamePass", "psPlus"));
  assert.deepEqual(summary(result), [
    [1, "pcGamePass"],
    [2, "family+psPlus"],
  ]);
  assert.deepEqual(result.warnings, []);
});

test("one failing source becomes a warning", async () => {
  const fetchFn = world({ "playstation.com": raw({}, 404) });
  const result = await scan(token, fetchFn, options("family", "psPlus"));
  assert.deepEqual(summary(result), [[2, "family"]]);
  assert.match(result.warnings[0], /PS Plus Game Catalog: HTTP 404/);
});

test("scan fails when nothing could be checked", async () => {
  const noFamily = world({ GetFamilyGroupForUser: reply({ is_not_member_of_any_group: true }) });
  await assert.rejects(scan(token, noFamily, options("family")), /isn't in a Steam Family/);
  await assert.rejects(scan(token, world(), options()), /at least one/);
});

test("HTTP errors don't leak the token", async () => {
  await assert.rejects(scan(token, async () => reply({}, 401), options("family")), (error) => {
    assert.match(error.message, /HTTP 401/);
    assert.ok(!error.message.includes(token));
    return true;
  });
});

test("titles match across stores but editions stay distinct", () => {
  const same = (a, b) => assert.equal(normalizeTitle(a), normalizeTitle(b));
  same("DOOM® Eternal Standard Edition", "Doom Eternal");
  same("A Little to the Left PS4 & PS5", "A Little to the Left");
  same("Assassin’s Creed", "Assassin's Creed (PC)");
  same("Ori and the Blind Forest", "Ori & the Blind Forest");
  same("Poké", "Poke");
  for (const [a, b] of [
    ["Cat", "Cat Remastered"],
    ["Alone in the Dark", "Alone in the Dark (1996)"],
    ["Portal", "Portal 2"],
  ]) {
    assert.notEqual(normalizeTitle(a), normalizeTitle(b));
  }
});

test("stored options are cleaned up", () => {
  assert.deepEqual(toOptions(), { sources: ["family"], country: "US" });
  assert.deepEqual(toOptions({ sources: ["psPlus", "bogus"], country: "ro" }), {
    sources: ["psPlus"],
    country: "RO",
  });
  assert.equal(toOptions({ country: "x&y" }).country, "US");
});

test("changes stop after three failures in a row", async () => {
  const games = [1, 2, 3, 4, 5].map((appid) => ({ appid, name: `${appid}` }));
  const tried = [];
  const done = await changeMany(
    games,
    async ({ appid }) => {
      tried.push(appid);
      if (appid === 3) throw new Error("network");
      return appid === 1;
    },
    () => {},
    async () => {},
  );
  assert.deepEqual(done.map((game) => game.appid), [1]);
  assert.deepEqual(tried, [1, 2, 3, 4]);
});

test("backend replies are read whether or not they arrive decoded", async () => {
  const data = { response: { items: [] } };
  const text = JSON.stringify(data);
  for (const reply of [
    JSON.stringify({ status: 200, body: text }),
    { status: 200, body: text },
    { status: 200, body: data },
  ]) {
    const response = backendResponse(reply);
    assert.equal(response.ok, true);
    assert.deepEqual(await response.json(), data);
  }
  assert.equal(backendResponse({ status: 403, body: "" }).ok, false);
});
