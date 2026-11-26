# Store listing text

For the Edge Add-ons and Chrome Web Store forms.

## Name

Wishlist Cleaner

## Short description

Remove Steam wishlist games you can already play through Steam Family, Game Pass or PS Plus.

## Description

Wishlist Cleaner finds games on your Steam wishlist that you can already play: shared by
your Steam Family, or listed in a Game Pass or PS Plus catalog.

- Choose what to check against.
- Scanning changes nothing. You review the list and confirm before anything is removed.
- Undo your latest removal (restored games get a new "added" date).

Pass catalogs are matched by game name, so check the results. This tool is not affiliated
with Valve, Microsoft or Sony.

Free to use. The panel has an optional Ko-fi donation link that unlocks nothing.

## Single purpose

Clean the user's Steam wishlist of games they can already play.

## Permission justifications

| Permission | Reason |
|---|---|
| `storage` | Remember the user's choices and latest removal |
| Access to `store.steampowered.com/wishlist` pages | Show the panel and change the wishlist when asked |
| `api.steampowered.com` | Read the wishlist, family library and game names |
| `catalog.gamepass.com`, `displaycatalog.mp.microsoft.com` | Read the Game Pass catalog |
| `www.playstation.com` | Read the PS Plus catalog |

## Remote code

None. All code is in the package.

## Data use

Authentication information (the Steam access token) is used only to perform the user's
request and is sent only to Steam.

## Privacy policy address

Enter `https://comaapps.dev/wishlist-cleaner/privacy.html` in the store form.

The page is `dist/release/privacy.html` (made by `npm run release`), copied to
`wishlist-cleaner/privacy.html` in the website's repository. It goes live when the website is
pushed. Check that the address loads before submitting.
