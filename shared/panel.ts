// The floating panel on the wishlist page (browser extension and Millennium).
// Nothing is removed until the Remove button is clicked twice.
import { changeMany, type WishlistAction } from "./change-many";
import { describeScan, type Game, type Match, type ScanResult } from "./steam-api";
import { labelOf, SOURCES, toOptions, type ScanOptions } from "./sources";
import { PANEL_CSS } from "./panel-style";
import { DEVELOPER_URL, KOFI_URL } from "./credits";

export interface PanelHost {
  scan(options: ScanOptions): Promise<ScanResult>;
  loadOptions(): Promise<ScanOptions | undefined>;
  saveOptions(options: ScanOptions): Promise<void>;
  change(action: WishlistAction, appid: number): Promise<boolean>;
  loadRemoved(): Promise<Game[]>;
  saveRemoved(games: Game[]): Promise<void>;
}

type Row = HTMLInputElement & { game: Game };

export function mountPanel(host: PanelHost): void {
  if (document.getElementById("sfwc-panel")) return;

  function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    props: Partial<HTMLElementTagNameMap[K]> = {},
    ...children: (Node | string)[]
  ): HTMLElementTagNameMap[K] {
    const node = Object.assign(document.createElement(tag), props);
    node.append(...children);
    return node;
  }

  const status = el("p", { className: "sfwc-status" });
  const list = el("ul", { className: "sfwc-list" });
  const scanButton = el("button", { textContent: "Scan wishlist" });
  const removeButton = el("button", { hidden: true });
  const undoButton = el("button", { textContent: "Undo last removal", hidden: true });
  const sourceBoxes = SOURCES.map(({ id, label }) => {
    const box = el("input", { type: "checkbox" });
    return { id, box, row: el("label", {}, box, label) };
  });
  const country = el("input", { type: "text", maxLength: 2 });
  const settings = el(
    "fieldset",
    { className: "sfwc-sources" },
    el("legend", {}, "Check against"),
    ...sourceBoxes.map((source) => source.row),
    el("label", {}, "Country code for passes", country),
  );
  const readOptions = () =>
    toOptions({
      sources: sourceBoxes.filter((source) => source.box.checked).map((source) => source.id),
      country: country.value,
    });
  function showOptions(options: ScanOptions) {
    sourceBoxes.forEach(({ id, box }) => (box.checked = options.sources.includes(id)));
    country.value = options.country;
  }
  const external = (href: string, ...children: (Node | string)[]) =>
    el("a", { href, target: "_blank", rel: "noopener noreferrer" }, ...children);
  // "ComaApps" is styled like the wordmark on comaapps.dev.
  const brand = el("span", { className: "sfwc-brand" }, "Coma", el("b", {}, "Apps"));
  const credits = el(
    "footer",
    { className: "sfwc-credits" },
    external(DEVELOPER_URL, "Developed by ", brand),
    external(KOFI_URL, "Support on Ko-fi"),
  );
  const body = el(
    "div",
    { className: "sfwc-body", hidden: true },
    settings,
    status,
    list,
    el("div", { className: "sfwc-actions" }, scanButton, removeButton, undoButton),
    credits,
  );
  const toggle = el("button", { textContent: "Wishlist Cleaner" });
  toggle.addEventListener("click", () => (body.hidden = !body.hidden));
  document.head.append(el("style", { textContent: PANEL_CSS }));
  document.body.append(el("div", { id: "sfwc-panel" }, toggle, body));

  let rows: { box: Row; item: HTMLLIElement }[] = [];
  let armed = false; // true after the first click on Remove
  const say = (text: string) => (status.textContent = text);
  const selected = () => rows.filter((row) => row.box.checked);

  function updateRemoveButton() {
    const count = selected().length;
    removeButton.textContent = armed
      ? `Click again to remove ${count}`
      : `Remove selected (${count})`;
    removeButton.hidden = rows.length === 0;
    removeButton.disabled = count === 0;
  }

  function showMatches(matches: Match[]) {
    rows = matches.map((game) => {
      const box = Object.assign(el("input", { type: "checkbox", checked: true }), { game });
      const link = el("a", {
        href: `/app/${game.appid}/`,
        target: "_blank",
        textContent: game.name,
      });
      const why = el("small", { textContent: game.reasons.map(labelOf).join(", ") });
      return { box, item: el("li", {}, box, el("span", {}, link, why)) };
    });
    list.replaceChildren(...rows.map((row) => row.item));
    updateRemoveButton();
  }

  /** Runs a task with the buttons locked, and reports any error in the panel. */
  async function run(task: () => Promise<void>) {
    const buttons = [scanButton, removeButton, undoButton];
    buttons.forEach((button) => (button.disabled = true));
    settings.disabled = true;
    try {
      await task();
    } catch (error) {
      say(error instanceof Error ? error.message : String(error));
    } finally {
      armed = false;
      settings.disabled = false;
      buttons.forEach((button) => (button.disabled = false));
      updateRemoveButton();
    }
  }

  list.addEventListener("change", () => {
    armed = false;
    updateRemoveButton();
  });

  settings.addEventListener("change", () => {
    const options = readOptions();
    showOptions(options);
    showMatches([]); // old results no longer match the settings
    say("");
    host.saveOptions(options);
  });

  scanButton.addEventListener("click", () =>
    run(async () => {
      say("Scanning…");
      showMatches([]);
      const result = await host.scan(readOptions());
      showMatches(result.matches);
      say(describeScan(result));
    }),
  );

  removeButton.addEventListener("click", () => {
    if (!armed) {
      armed = true;
      updateRemoveButton();
      return;
    }
    run(async () => {
      const games = selected().map((row) => row.box.game);
      const removed = await changeMany(
        games,
        (game) => host.change("removefromwishlist", game.appid),
        (game, i) => say(`Removing ${i + 1} of ${games.length}: ${game.name}`),
      );
      if (removed.length) {
        await host.saveRemoved(removed);
        undoButton.hidden = false;
      }
      const ids = new Set(removed.map((game) => game.appid));
      rows.filter((row) => ids.has(row.box.game.appid)).forEach((row) => row.item.remove());
      rows = rows.filter((row) => !ids.has(row.box.game.appid));
      say(
        removed.length === games.length
          ? `Removed ${removed.length} game(s). Reload the page to see your updated wishlist.`
          : `Removed ${removed.length} of ${games.length}. The rest failed; wait a minute and retry.`,
      );
    });
  });

  undoButton.addEventListener("click", () =>
    run(async () => {
      const games = await host.loadRemoved();
      const restored = await changeMany(
        games,
        (game) => host.change("addtowishlist", game.appid),
        (game, i) => say(`Restoring ${i + 1} of ${games.length}: ${game.name}`),
      );
      const ids = new Set(restored.map((game) => game.appid));
      const remaining = games.filter((game) => !ids.has(game.appid));
      await host.saveRemoved(remaining);
      undoButton.hidden = remaining.length === 0;
      say(`Restored ${restored.length} of ${games.length} game(s).`);
    }),
  );

  showOptions(toOptions());
  host.loadOptions().then((options) => showOptions(toOptions(options)));
  host.loadRemoved().then((games) => (undoButton.hidden = games.length === 0));
}
