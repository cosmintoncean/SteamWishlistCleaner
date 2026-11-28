First release. Steam Wishlist Cleaner removes games from your Steam wishlist that you can
already play through your Steam Family, Game Pass or PS Plus.

## Install the browser extension

- **[Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/steam-wishlist-cleaner/feljepenkddfhfmopgkfpdfbcbbkhlen)**
- **[Chrome Web Store](https://chromewebstore.google.com/detail/steam-wishlist-cleaner/fppnhlbhhceonmlikhbenkeecnkaogpl)**

## Downloads

| File | For | Status |
|---|---|---|
| `steam-wishlist-cleaner-browser-1.0.0.zip` | Manual install in Edge, Chrome or other Chromium browsers | Tested in Edge and Chrome |
| `steam-wishlist-cleaner-millennium-1.0.0.star` | Steam desktop client with Millennium 3.4+ | Tested when built from source |
| `steam-wishlist-cleaner-decky-1.0.0.zip` | Steam Deck with Decky Loader | **Experimental: never run on a Deck** |
| `SHA256SUMS.txt` | Checking your downloads | |

The plugins are not in the Millennium or Decky stores and have not been reviewed by either
project.

## Install

### Browser

Use the store links above, then open your Steam wishlist and click **Wishlist Cleaner** at
the bottom right. The store keeps the extension up to date.

To install from the zip instead (remove the store copy first):

1. Extract the browser zip into a folder you'll keep.
2. Open `edge://extensions` (or `chrome://extensions`) and turn on **Developer mode**.
3. Click **Load unpacked** and choose that folder.

### Inside the Steam client (Extendium)

You can add the extension from the Chrome Web Store with the third-party Extendium plugin
for Millennium. This is untested: see
[the steps](https://github.com/cosmintoncean/SteamWishlistCleaner#inside-the-steam-client-extendium).

### Millennium

1. Install [Millennium](https://steambrew.app) 3.4 or newer, then quit Steam.
2. Copy the `.star` file into `C:\Program Files (x86)\Steam\millennium\plugins`.
3. Start Steam and enable **Steam Wishlist Cleaner** in Millennium's settings.
4. Open your wishlist in the Store tab and click **Wishlist Cleaner**.

Installing this downloaded file by hand is untested, and it is unsigned. If it doesn't
appear, [build from source](https://github.com/cosmintoncean/SteamWishlistCleaner#build-from-source).

### Steam Deck

1. Install [Decky Loader](https://decky.xyz).
2. In Desktop Mode, download the Decky zip. Don't extract it.
3. In Gaming Mode, open Decky's settings and turn on **Developer mode**.
4. In the **Developer** section, install the plugin from the ZIP file.
5. Open the Steam Store once, then open the plugin from the Quick Access menu and scan.

## Before you remove anything

Game Pass and PS Plus games are matched by name, so check the list. **Undo last removal**
restores your latest batch, but not each game's original date or position.

Not affiliated with or endorsed by Valve, Microsoft or Sony. Written with AI assistance.
