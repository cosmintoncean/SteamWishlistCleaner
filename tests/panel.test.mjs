// Runs the built browser content script against a minimal fake page and fake Steam.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

class Node {
  constructor(tag) {
    Object.assign(this, { tag, children: [], listeners: {} });
  }
  append(...kids) {
    for (const kid of kids) {
      if (kid instanceof Node) kid.parent = this;
      this.children.push(kid);
    }
  }
  replaceChildren(...kids) {
    this.children = [];
    this.append(...kids);
  }
  remove() {
    this.parent.children.splice(this.parent.children.indexOf(this), 1);
  }
  addEventListener(type, listener) {
    this.listeners[type] = listener;
  }
  all() {
    return this.children.flatMap((kid) => (kid instanceof Node ? [kid, ...kid.all()] : []));
  }
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

test("scan, confirm, remove and undo", async () => {
  const body = new Node("body");
  const stored = {};
  const posts = [];
  const games = [
    { appid: 1, name: "A", reasons: ["family"] },
    { appid: 2, name: "B", reasons: ["pcGamePass"] },
  ];

  vm.runInNewContext(readFileSync("dist/browser/content.js", "utf8"), {
    document: {
      body,
      head: new Node("head"),
      cookie: "x=1; sessionid=abc",
      createElement: (tag) => new Node(tag),
      getElementById: () => null,
    },
    setTimeout: (callback) => callback(),
    URLSearchParams,
    chrome: {
      runtime: {
        sendMessage: async () => ({
          ok: true,
          result: { matches: games, wishlistCount: 3, warnings: [] },
        }),
      },
      storage: {
        local: {
          get: async (key) => ({ [key]: stored[key] }),
          set: async (values) => Object.assign(stored, values),
        },
      },
    },
    fetch: async (url, options) => {
      if (options.method !== "POST") {
        return { ok: true, json: async () => ({ data: { webapi_token: "t" } }) };
      }
      posts.push(`${url} ${options.body}`);
      const success = !(url.includes("remove") && String(options.body).includes("appid=2"));
      return { ok: true, json: async () => ({ success }) };
    },
  });

  const button = (text) =>
    body.all().find((node) => node.tag === "button" && node.textContent?.startsWith(text));
  const status = () => body.all().find((node) => node.className === "sfwc-status").textContent;
  const click = async (text) => {
    button(text).listeners.click();
    for (let i = 0; i < 5; i++) await settle();
  };

  const links = body.all().filter((node) => node.tag === "a").map((node) => node.href);
  assert.deepEqual(links, ["https://comaapps.dev/", "https://ko-fi.com/comaapps"]);

  await click("Scan wishlist");
  assert.match(status(), /2 of 3/);
  await click("Unselect all");
  assert.equal(button("Remove selected (0)").disabled, true);
  await click("Select all");
  await click("Remove selected");
  assert.equal(posts.length, 0, "the first click only asks for confirmation");
  await click("Unselect all");
  await click("Select all");
  assert.ok(button("Remove selected (2)"));
  await click("Remove selected");
  assert.equal(posts.length, 0);
  await click("Click again to remove 2");
  assert.match(status(), /Removed 1 of 2/);
  assert.equal(stored.lastRemoved.map((game) => game.appid).join(), "1");
  assert.ok(button("Remove selected (1)"));
  await click("Undo last removal");
  assert.match(status(), /Restored 1 of 1/);
  const boxes = body.all().filter((node) => node.game);
  assert.equal(boxes.map((box) => `${box.game.name}:${box.checked}`).join(), "A:false,B:true");
  assert.equal(posts.at(-1), "/api/addtowishlist sessionid=abc&appid=1");
});
