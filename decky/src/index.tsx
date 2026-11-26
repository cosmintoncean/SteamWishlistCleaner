import { callable, definePlugin, fetchNoCors } from "@decky/api";
import {
  ButtonItem,
  DialogButton,
  Focusable,
  Navigation,
  PanelSection,
  PanelSectionRow,
  staticClasses,
  TextField,
  ToggleField,
} from "@decky/ui";
import { useEffect, useState } from "react";
import { FaBroom } from "react-icons/fa";

import { changeMany, type WishlistAction } from "../../shared/change-many";
import { DEVELOPER_URL, KOFI_URL } from "../../shared/credits";
import {
  describeScan,
  scan,
  withRestored,
  type Game,
  type Match,
} from "../../shared/steam-api";
import { labelOf, SOURCES, toOptions, type ScanOptions } from "../../shared/sources";

const getToken = callable<[], { ok: boolean; token?: string; error?: string }>("get_token");
const changeWishlist = callable<[action: WishlistAction, appid: number], boolean>("change_wishlist");

const UNDO_KEY = "sfwc-lastRemoved";
const OPTIONS_KEY = "sfwc-options";
const loadRemoved = (): Game[] => JSON.parse(localStorage.getItem(UNDO_KEY) ?? "[]");
const saveRemoved = (games: Game[]) => localStorage.setItem(UNDO_KEY, JSON.stringify(games));

interface State {
  message: string;
  options: ScanOptions;
  country: string; // as typed
  matches: Match[];
  kept: number[]; // app IDs the user switched off
  busy: boolean;
  armed: boolean; // true after the first press of Remove
}

// Kept outside the component: it unmounts whenever the Quick Access menu closes,
// including while the user goes to the store, and a removal may still be running.
const storedOptions = toOptions(JSON.parse(localStorage.getItem(OPTIONS_KEY) ?? "null"));
let state: State = {
  options: storedOptions,
  country: storedOptions.country,
  message: "Open the Steam Store once, then scan.",
  matches: [],
  kept: [],
  busy: false,
  armed: false,
};
let notify = () => {};

function update(patch: Partial<State>) {
  state = { ...state, ...patch };
  notify();
}

/** Saves new settings and clears results that no longer match them. */
function changeOptions(options: ScanOptions) {
  localStorage.setItem(OPTIONS_KEY, JSON.stringify(options));
  update({ options, country: options.country, matches: [], kept: [], armed: false });
}

async function run(task: () => Promise<void>) {
  if (state.busy) return;
  update({ busy: true });
  try {
    await task();
  } catch (error) {
    update({ message: error instanceof Error ? error.message : String(error) });
  } finally {
    update({ busy: false, armed: false });
  }
}

const scanWishlist = () =>
  run(async () => {
    update({ message: "Scanning…", matches: [], kept: [] });
    const session = await getToken();
    if (!session.ok || !session.token) throw new Error(session.error ?? "The scan failed.");
    const result = await scan(
      session.token,
      (url) => fetchNoCors(url),
      state.options,
      (progress) => update({ message: `Scanning… ${progress}` }),
    );
    update({ matches: result.matches, message: describeScan(result) });
  });

const removeSelected = (games: Game[]) =>
  run(async () => {
    const removed = await changeMany(
      games,
      (game) => changeWishlist("removefromwishlist", game.appid),
      (game, i) => update({ message: `Removing ${i + 1} of ${games.length}: ${game.name}` }),
    );
    if (removed.length) saveRemoved(removed);
    const ids = new Set(removed.map((game) => game.appid));
    update({
      matches: state.matches.filter((game) => !ids.has(game.appid)),
      message:
        removed.length === games.length
          ? `Removed ${removed.length} game(s).`
          : `Removed ${removed.length} of ${games.length}. Open the Store and retry in a minute.`,
    });
  });

const undoRemoval = () =>
  run(async () => {
    const games = loadRemoved();
    const restored = await changeMany(
      games,
      (game) => changeWishlist("addtowishlist", game.appid),
      (game, i) => update({ message: `Restoring ${i + 1} of ${games.length}: ${game.name}` }),
    );
    const ids = new Set(restored.map((game) => game.appid));
    saveRemoved(games.filter((game) => !ids.has(game.appid)));
    // Restored games come back switched off, so they aren't removed again by accident.
    update({
      matches: withRestored(state.matches, restored),
      kept: [...state.kept, ...restored.map((game) => game.appid)],
      message: `Restored ${restored.length} of ${games.length} game(s).`,
    });
  });

const openWeb = (url: string) => {
  Navigation.CloseSideMenus();
  Navigation.NavigateToExternalWeb(url);
};

const creditStyle = {
  minWidth: 0,
  flex: 1,
  height: "auto",
  padding: "6px 4px",
  fontSize: "11px",
  background: "transparent",
};

// "ComaApps" is styled like the wordmark on comaapps.dev.
const Brand = () => (
  <span style={{ fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 600 }}>
    Coma
    <b
      style={{
        color: "transparent",
        backgroundImage: "linear-gradient(110deg, #ff8a3d 0%, #ec4899 50%, #8b5cf6 100%)",
        backgroundClip: "text",
        WebkitBackgroundClip: "text",
      }}
    >
      Apps
    </b>
  </span>
);

const Credits = () => (
  <PanelSection>
    <PanelSectionRow>
      <Focusable style={{ display: "flex", gap: "4px" }}>
        <DialogButton style={creditStyle} onClick={() => openWeb(DEVELOPER_URL)}>
          Developed by <Brand />
        </DialogButton>
        <DialogButton style={creditStyle} onClick={() => openWeb(KOFI_URL)}>
          Support on Ko-fi
        </DialogButton>
      </Focusable>
    </PanelSectionRow>
  </PanelSection>
);

function Content() {
  const [, setVersion] = useState(0);
  useEffect(() => {
    notify = () => setVersion((version) => version + 1);
    notify(); // pick up changes made before this effect ran
    return () => {
      notify = () => {};
    };
  }, []);

  const { options, country, message, matches, kept, busy, armed } = state;
  const selected = matches.filter((game) => !kept.includes(game.appid));

  return (
    <>
      <PanelSection>
        <PanelSectionRow>
          <div>{message}</div>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={busy} onClick={scanWishlist}>
            Scan wishlist
          </ButtonItem>
        </PanelSectionRow>
        {matches.length > 0 && (
          <PanelSectionRow>
            <ButtonItem
              layout="below"
              disabled={busy || selected.length === 0}
              onClick={() => (armed ? removeSelected(selected) : update({ armed: true }))}
            >
              {armed ? `Press again to remove ${selected.length}` : `Remove selected (${selected.length})`}
            </ButtonItem>
          </PanelSectionRow>
        )}
        {loadRemoved().length > 0 && (
          <PanelSectionRow>
            <ButtonItem layout="below" disabled={busy} onClick={undoRemoval}>
              Undo last removal
            </ButtonItem>
          </PanelSectionRow>
        )}
      </PanelSection>
      {matches.length > 0 && (
        <PanelSection title="You can already play">
          <PanelSectionRow>
            <ButtonItem
              layout="below"
              disabled={busy}
              onClick={() =>
                update({
                  armed: false,
                  kept: kept.length === 0 ? matches.map((game) => game.appid) : [],
                })
              }
            >
              {kept.length === 0 ? "Unselect all" : "Select all"}
            </ButtonItem>
          </PanelSectionRow>
          {matches.map((game) => (
            <PanelSectionRow key={game.appid}>
              <ToggleField
                label={game.name}
                description={game.reasons.map(labelOf).join(", ")}
                checked={!kept.includes(game.appid)}
                disabled={busy}
                onChange={(remove: boolean) =>
                  update({
                    armed: false,
                    kept: remove
                      ? state.kept.filter((appid) => appid !== game.appid)
                      : [...state.kept, game.appid],
                  })
                }
              />
            </PanelSectionRow>
          ))}
        </PanelSection>
      )}
      <PanelSection title="Check against">
        {SOURCES.map(({ id, label }) => (
          <PanelSectionRow key={id}>
            <ToggleField
              label={label}
              checked={options.sources.includes(id)}
              disabled={busy}
              onChange={(on: boolean) => {
                const others = state.options.sources.filter((source) => source !== id);
                const sources = on ? [...others, id] : others;
                changeOptions(toOptions({ ...state.options, sources }));
              }}
            />
          </PanelSectionRow>
        ))}
        <PanelSectionRow>
          <TextField
            label="Country code for passes"
            value={country}
            disabled={busy}
            onChange={(event) => {
              const typed = event.target.value.toUpperCase().slice(0, 2);
              if (typed.length < 2) update({ country: typed });
              else changeOptions(toOptions({ ...state.options, country: typed }));
            }}
          />
        </PanelSectionRow>
      </PanelSection>
      <Credits />
    </>
  );
}

export default definePlugin(() => ({
  name: "Wishlist Cleaner",
  titleView: <div className={staticClasses.Title}>Wishlist Cleaner</div>,
  content: <Content />,
  icon: <FaBroom />,
}));
