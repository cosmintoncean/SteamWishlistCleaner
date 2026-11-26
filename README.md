# Wishlist Cleaner

Developed by [ComaApps](https://comaapps.dev/) · [Support on Ko-fi](https://ko-fi.com/comaapps)

Removes games from your Steam wishlist that you can already play through your Steam Family,
Game Pass or PS Plus.

Not affiliated with, or endorsed by, Valve, Microsoft or Sony. It relies on undocumented
endpoints that can change at any time. Use it at your own risk.

It comes in three versions:

| Version | Where it works | Where the button is |
|---|---|---|
| Browser extension | Edge (tested); Chrome and Brave expected to work | Wishlist page, bottom right |
| Millennium plugin (tested) | Steam desktop client | Wishlist page in the Store tab, bottom right |
| Decky Loader plugin (experimental, untested) | Steam Deck, Gaming Mode | Quick Access menu, Decky tab |

## Download

This repository is private. Release zips are shared by
[ComaApps](https://comaapps.dev/). For the browser, unzip
`wishlist-cleaner-browser-<version>.zip` into a folder you'll keep, then load that folder as
described under [Browser](#browser). For Steam Deck, use
`wishlist-cleaner-decky-<version>.zip`. The release also includes the Millennium
package, `wishlist-cleaner-millennium-<version>.star`; building it from source is described
under [Millennium](#millennium).

## Build

Needs Node.js and Python.

```powershell
npm install
```

```powershell
npm install --prefix millennium
```

```powershell
npm run build:browser
```

```powershell
npm run build:decky
```

## Install

### Browser

1. Open `chrome://extensions` (or `edge://extensions`) and turn on **Developer mode**.
2. Click **Load unpacked** and choose `dist/browser` (or your unzipped download).

### Millennium

1. Install [Millennium](https://steambrew.app) 3.4 or newer.
2. Run `npm run build:millennium`. The compiler detects Millennium and installs the plugin.
3. Enable **Wishlist Cleaner** in Millennium's settings.

### Decky Loader

1. Download the Decky zip, or run `npm run release` to create it in `dist/release`.
2. Copy the zip to your Steam Deck.
3. In Decky's settings, turn on developer mode and install the plugin from the zip file.

## Use

1. Sign in to the Steam store. On a Steam Deck, open the Store so a store page is loaded.
2. Under **Check against**, pick Steam Family and the subscriptions you have, and enter your
   two-letter country code.
3. Click **Scan wishlist**. Scanning changes nothing.
4. Check the list and untick (Deck: switch off) any game you want to keep. **Unselect all**
   and **Select all** change the whole list at once.
5. Click **Remove selected**, then click again to confirm.

**Undo last removal** adds the games from your latest removal back and lists them again,
unticked. Steam treats them as
newly added, so their original date and rank are lost. Each version remembers its own
removals.

The tool always works on the signed-in account's wishlist.

## What counts as a match

Each listed game shows why it matched.

**Steam Family:** another member owns it, Steam does not mark it as excluded from sharing,
and you don't own it yourself.

**Game Pass and PS Plus:** the Steam name matches a title in that subscription's current
catalog. Trademark signs, accents, punctuation and platform labels are ignored. Editions
must match, so "Game Remastered" doesn't match "Game", and some games will be missed. Two
different games can share a name (an original and its remake), so check the list.

| Choice | Catalog |
|---|---|
| PC Game Pass | All PC games |
| Console Game Pass | All console games |
| PS Plus Game Catalog | PS Plus Extra and Premium games (PS4, PS5) |
| PS Plus Classics | Premium classics |

Subscription catalogs differ by country and change often: a removed game may leave the
catalog later. Monthly PS Plus games are not checked. If you want your own copy of a game,
keep it.

## Privacy

The full policy is in [PRIVACY.md](PRIVACY.md).

Your Steam web access token is read from a store page and used only for requests to
`api.steampowered.com`. It is not saved or logged. The only things stored are your
**Check against** choices and the list of games from your latest removal. Subscription
catalogs are read from `gamepass.com`, `microsoft.com` and `playstation.com` without your
Steam details.

- Millennium: the plugin's backend makes the API requests, limited to the read-only ones it needs.
- Decky: the backend runs the token and wishlist requests inside an open store page,
  through Steam's local debugger.

## Limitations

The Steam endpoints and subscription catalogs used here are undocumented and can change
without notice. To check that the catalogs still respond:

```powershell
node scripts/check-catalogs.mjs US
```

## Development

```powershell
npm test
```

```powershell
npm run typecheck
```

(`typecheck` needs one Millennium build first, which generates its type files.)

| Folder | Contents |
|---|---|
| `shared/` | Matching rules, catalogs, bulk changes, and the panel used on store pages |
| `browser/` | Browser extension |
| `millennium/` | Millennium plugin: Lua backend and store page script |
| `decky/` | Decky plugin: Python backend and Quick Access panel |

## Releasing

1. Set the new version in `package.json`, `browser/manifest.source.json`,
   `decky/package.json` and `millennium/millennium.toml`, and update `CHANGELOG.md`.
2. Run `npm run release`. The release files and checksums appear in `dist/release`.
3. Publish both zips, the `.star` file and `SHA256SUMS.txt` on comaapps.dev (downloads from this private
   repository aren't public).
4. If `PRIVACY.md` changed, upload the new `dist/release/privacy.html` too, and enter its
   public address in the store forms.

Store form text is in [docs/store-listing.md](docs/store-listing.md).

## License

[BSD-3-Clause](LICENSE). See also [third-party notices](THIRD_PARTY_NOTICES.md).

## Ideas

- Also match games already played or owned on console. This needs a list of those games (manual
  or imported) and a way to map their names to Steam app IDs.
