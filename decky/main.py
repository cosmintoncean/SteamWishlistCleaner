"""Backend for the Decky plugin.

Wishlist requests need the signed-in store session, so they run inside an open
Steam Store page, reached through Steam's local debugger (which Decky relies on).
"""

import asyncio
import json

import aiohttp
import decky

DEBUGGER_TABS = "http://localhost:8080/json"
STORE = "https://store.steampowered.com/"
ACTIONS = ("removefromwishlist", "addtowishlist")

TOKEN_SCRIPT = """
fetch("/pointssummary/ajaxgetasyncconfig", {credentials: "include"})
    .then((res) => res.json())
    .then((body) => body?.data?.webapi_token || "")
"""

CHANGE_SCRIPT = """
(async (action, appid) => {
    const sessionid = document.cookie.match(/(?:^|;\\s*)sessionid=([^;]+)/)?.[1];
    if (!sessionid) return false;
    const res = await fetch("/api/" + action, {
        method: "POST",
        credentials: "include",
        body: new URLSearchParams({sessionid, appid: String(appid)}),
    });
    return res.ok && Boolean((await res.json())?.success);
})(%s, %d)
"""


async def _evaluate(expression: str):
    async with aiohttp.ClientSession() as session:
        async with session.get(DEBUGGER_TABS) as res:
            tabs = await res.json(content_type=None)
        # Only ever run scripts in a page on the store's own origin.
        tab = next(
            (
                t
                for t in tabs
                if t.get("url", "").startswith(STORE) and t.get("webSocketDebuggerUrl")
            ),
            None,
        )
        if tab is None:
            raise RuntimeError("Open the Steam Store, then try again.")
        async with session.ws_connect(tab["webSocketDebuggerUrl"], max_msg_size=0) as ws:
            await ws.send_json(
                {
                    "id": 1,
                    "method": "Runtime.evaluate",
                    "params": {
                        "expression": expression,
                        "awaitPromise": True,
                        "returnByValue": True,
                    },
                }
            )
            async for message in ws:
                reply = message.json()
                if reply.get("id") != 1:
                    continue
                result = reply.get("result", {})
                if "error" in reply or "exceptionDetails" in result:
                    raise RuntimeError("The Steam Store page couldn't complete the request.")
                return result.get("result", {}).get("value")
    raise RuntimeError("Lost the connection to the Steam Store page.")


async def evaluate_in_store(expression: str):
    return await asyncio.wait_for(_evaluate(expression), timeout=20)


class Plugin:
    async def get_token(self) -> dict:
        try:
            token = await evaluate_in_store(TOKEN_SCRIPT)
        except RuntimeError as error:
            return {"ok": False, "error": str(error)}
        except Exception as error:
            # Log the type only, so nothing sensitive ends up in the log.
            decky.logger.error("Reading the Steam session failed: %s", type(error).__name__)
            return {"ok": False, "error": "Couldn't reach the Steam Store page."}
        if not token:
            return {"ok": False, "error": "Sign in to the Steam Store, then try again."}
        return {"ok": True, "token": token}

    async def change_wishlist(self, action: str, appid: int) -> bool:
        if action not in ACTIONS or type(appid) is not int or appid <= 0:
            return False
        try:
            script = CHANGE_SCRIPT % (json.dumps(action), appid)
            return await evaluate_in_store(script) is True
        except Exception as error:
            decky.logger.error("Wishlist change failed: %s", type(error).__name__)
            return False

    async def _main(self):
        decky.logger.info("Steam Wishlist Cleaner loaded")

    async def _unload(self):
        decky.logger.info("Steam Wishlist Cleaner unloaded")
