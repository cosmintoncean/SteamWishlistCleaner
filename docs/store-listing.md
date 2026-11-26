# Microsoft Edge Add-ons submission

Submitted 26 November 2026. The Chrome Web Store values are [at the end](#chrome-web-store).

Values for each page in Partner Center. Official steps:
[Publish a Microsoft Edge extension](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension).

## Packages

Upload `dist/release/steam-wishlist-cleaner-browser-1.0.0.zip` (made by `npm run release`).

## Availability

Visibility: **Public** (or **Hidden** to try the listing through its link first). Markets: all.

## Properties

| Field | Value |
|---|---|
| Category | Shopping |
| Website | `https://comaapps.dev/` |
| Support contact | `cosmintoncean@gmail.com` |
| Mature content | No |

## Privacy

**Single purpose**

Removes games from the user's Steam wishlist that they can already play.

**Permission justifications**

| Permission | Justification |
|---|---|
| `storage` | Saves the user's check choices, country code and the list of games from their latest removal, for undo. |
| `https://store.steampowered.com/wishlist*` (content script) | Shows the panel on the wishlist page, reads the signed-in user's Steam access token, and removes or restores wishlist games when the user asks. |
| `https://api.steampowered.com/*` | Reads the user's wishlist, Steam Family library and game names. |
| `https://catalog.gamepass.com/*`, `https://displaycatalog.mp.microsoft.com/*` | Reads the public Game Pass catalog, only if the user ticks Game Pass. |
| `https://www.playstation.com/*` | Reads the public PS Plus catalog, only if the user ticks PS Plus. |

**Remote code:** No.

**Data usage:** tick **Authentication information**. The Steam access token (which contains
the Steam ID) is used only to carry out the user's request and is sent only to Steam.
Nothing is sent to the developer. Read each certification statement before ticking it.

**Privacy policy URL:** `https://comaapps.dev/steam-wishlist-cleaner/privacy.html`

The page is `dist/release/privacy.html`, copied to `steam-wishlist-cleaner/privacy.html` in the
website's repository. It goes live when the website is pushed. Check that the address loads
and shows the current text before submitting.

## Store listing (English)

The name and short description come from the manifest.

**Description**

```text
Steam Wishlist Cleaner finds games on your Steam wishlist that you can already play, and removes the ones you choose.

Check your wishlist against:
- games shared by your Steam Family
- PC Game Pass and Console Game Pass
- the PS Plus Game Catalog and Classics

How it works:
1. Sign in to the Steam store and open your wishlist.
2. Click Wishlist Cleaner at the bottom right.
3. Choose what to check against and enter your two-letter country code.
4. Scan. Scanning changes nothing, and each result shows why it matched.
5. Untick any game you want to keep, then click Remove twice to confirm.

You can undo your latest removal. Restored games get a new "added" date and lose their old position.

Limitations:
- Game Pass and PS Plus games are matched by name, so some are missed. An original and its remake can share a name, so check the list.
- Catalogs differ by country and change over time. Monthly PS Plus games are not checked.
- It relies on undocumented Steam and catalog services that can change at any time.

Your Steam sign-in token is sent only to Steam. There are no analytics or ads. The panel has an optional Ko-fi donation link that unlocks nothing.

Not affiliated with or endorsed by Valve, Microsoft or Sony.
```

**Extension logo:** `docs/store-logo-300.png`

**Screenshots** (1280 x 800, made by `python scripts/make-screenshots.py`; the games shown
are made up):

1. `docs/store-screenshots/1-choose.png`
2. `docs/store-screenshots/2-review.png`
3. `docs/store-screenshots/3-confirm.png`

**Search terms:** steam wishlist, wishlist cleaner, steam family, game pass, ps plus

## Notes for certification

```text
The extension only runs on https://store.steampowered.com/wishlist pages and needs a signed-in Steam account with at least one wishlisted game. No account of our own is used.

To test:
1. Sign in to Steam and open your wishlist.
2. Click "Wishlist Cleaner" at the bottom right.
3. Untick "Steam Family" unless the account belongs to a Steam Family, tick "PC Game Pass", and keep country US.
4. Click "Scan wishlist". To get a match, first wishlist a game on Steam that is also in PC Game Pass and that the account does not own.
5. Click "Remove selected", click again to confirm, then click "Undo last removal".

All code is in the package; no remote code is loaded. The Steam access token is read from the store page and sent only to api.steampowered.com.
```

# Chrome Web Store

[Developer dashboard](https://chrome.google.com/webstore/devconsole). Registration needs a
one-time fee. Use the same package zip.

## Store listing

| Field | Value |
|---|---|
| Description | The description above |
| Category | Shopping |
| Language | English |
| Store icon | `browser/icons/icon-128.png` |
| Screenshots | The three images in `docs/store-screenshots` |
| Small promo tile | `docs/store-tile-440x280.png` |
| Homepage URL | `https://comaapps.dev/` |
| Support URL | `https://github.com/cosmintoncean/SteamWishlistCleaner/issues` |

## Privacy practices

Use the single purpose, permission justifications and privacy policy address above. For the
host permission box, use the host justifications together. Remote code: **No**.

Data usage: tick **Personally identifiable information** and **Authentication information**,
as for Edge, then read and tick the three certifications. The policy page must show its
**Limited Use** section before you submit.

## Distribution

Public, all regions, free.

## Test instructions

Use the certification notes above.

