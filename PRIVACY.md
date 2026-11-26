# Privacy policy

Last updated: 26 November 2026

Wishlist Cleaner runs on your own device. Its authors run no server, collect nothing and
receive none of your data. It has no analytics or advertising.

## What it reads

- Your Steam web access token, read from your signed-in Steam store page.
- Your Steam ID (contained in that token), wishlist and Steam Family library.

## Where requests go

| Site | What is sent | Why |
|---|---|---|
| `store.steampowered.com` | Your normal signed-in session | Get the token; remove or restore wishlist games |
| `api.steampowered.com` | Access token, Steam ID, family group ID | Read your wishlist and family library |
| `api.steampowered.com` | Wishlisted game IDs and your country code | Look up game names (only if a pass is ticked) |
| `catalog.gamepass.com`, `displaycatalog.mp.microsoft.com` | Country code and catalog product IDs | Read the Game Pass catalog (only if ticked) |
| `www.playstation.com` | Country code | Read the PS Plus catalog (only if ticked) |

No Steam token or Steam ID is sent to Microsoft or PlayStation. As with any web request,
each site can see your IP address.

## What is stored

Only on your device: your **Check against** choices, your country code, and the list of
games from your latest removal. The access token is not saved or logged. Uninstalling the
browser extension deletes its stored data. The Millennium and Decky versions keep it in
Steam's local web storage.

## Links

The panel links to `comaapps.dev` and `ko-fi.com`. Nothing is loaded from or sent to those
sites unless you open a link.

## Contact

Open an issue on the project's repository.
