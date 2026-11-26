"""Tests the Decky backend with stand-ins for Decky, aiohttp and Steam's debugger."""

import asyncio
import logging
import shutil
import subprocess
import sys
import types
import unittest
from pathlib import Path

sys.dont_write_bytecode = True
sys.modules["decky"] = types.SimpleNamespace(logger=logging.getLogger("test"))
sys.modules.setdefault("aiohttp", types.SimpleNamespace(ClientSession=None))
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "decky"))
import main  # noqa: E402


class Context:
    def __init__(self, value):
        self.value = value

    async def __aenter__(self):
        return self.value

    async def __aexit__(self, *exc):
        return False


class Socket:
    def __init__(self, reply):
        self.reply, self.sent = reply, []

    async def send_json(self, data):
        self.sent.append(data)

    async def __aiter__(self):
        for data in ({"method": "noise"}, {"id": 1, **self.reply}):
            yield types.SimpleNamespace(json=lambda data=data: data)


def fake_steam(tab_urls, reply):
    socket = Socket(reply)
    opened = []

    class Response:
        async def json(self, content_type=None):
            return [{"url": url, "webSocketDebuggerUrl": url + "#ws"} for url in tab_urls]

    class Session(Context):
        def __init__(self):
            super().__init__(self)

        def get(self, url):
            return Context(Response())

        def ws_connect(self, url, max_msg_size):
            opened.append(url)
            return Context(socket)

    main.aiohttp.ClientSession = Session
    return socket, opened


def value(result):
    return {"result": {"result": {"value": result}}}


class DeckyBackendTest(unittest.TestCase):
    def run_async(self, coroutine):
        return asyncio.run(coroutine)

    def test_reads_token_from_the_store_tab_only(self):
        _, opened = fake_steam(
            ["https://evil.example/https://store.steampowered.com/",
             "https://store.steampowered.com/app/1/"],
            value("abc"),
        )
        self.assertEqual(self.run_async(main.Plugin().get_token()), {"ok": True, "token": "abc"})
        self.assertEqual(opened, ["https://store.steampowered.com/app/1/#ws"])

    def test_asks_for_the_store_when_it_is_closed(self):
        fake_steam(["https://steamloopback.host/index.html"], value("abc"))
        reply = self.run_async(main.Plugin().get_token())
        self.assertFalse(reply["ok"])
        self.assertIn("Open the Steam Store", reply["error"])

    def test_reports_signed_out(self):
        fake_steam([main.STORE], value(""))
        self.assertIn("Sign in", self.run_async(main.Plugin().get_token())["error"])

    def test_rejects_unexpected_changes(self):
        socket, _ = fake_steam([main.STORE], value(True))
        plugin = main.Plugin()
        for action, appid in [("logout", 1), ("removefromwishlist", "1"), ("addtowishlist", -1)]:
            self.assertFalse(self.run_async(plugin.change_wishlist(action, appid)))
        self.assertEqual(socket.sent, [])

    def test_change_succeeds_only_when_steam_says_so(self):
        for result, expected in [(True, True), (False, False), (None, False)]:
            fake_steam([main.STORE], value(result))
            self.assertIs(
                self.run_async(main.Plugin().change_wishlist("removefromwishlist", 7)), expected
            )

    def test_change_script_is_valid_javascript(self):
        script = main.CHANGE_SCRIPT % ('"removefromwishlist"', 7)
        harness = (
            'globalThis.document={cookie:"a=1; sessionid=abc"};'
            "globalThis.fetch=async(u,o)=>({ok:u==='/api/removefromwishlist'&&"
            "String(o.body)==='sessionid=abc&appid=7',json:async()=>({success:true})});"
            f"({script}).then((ok)=>process.exit(ok?0:1));"
        )
        subprocess.run([shutil.which("node"), "-e", harness], check=True)


if __name__ == "__main__":
    unittest.main()
