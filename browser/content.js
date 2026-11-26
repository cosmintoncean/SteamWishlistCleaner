import { mountPanel } from "../shared/panel";
import { changeWishlist, getToken } from "../shared/store-page";

const UNDO_KEY = "lastRemoved";
const OPTIONS_KEY = "options";

mountPanel({
  async scan(options) {
    const token = await getToken();
    const reply = await chrome.runtime.sendMessage({ type: "scan", token, options });
    if (!reply?.ok) throw new Error(reply?.error ?? "The scan failed.");
    return reply.result;
  },
  change: changeWishlist,
  loadOptions: async () => (await chrome.storage.local.get(OPTIONS_KEY))[OPTIONS_KEY],
  saveOptions: (options) => chrome.storage.local.set({ [OPTIONS_KEY]: options }),
  loadRemoved: async () => (await chrome.storage.local.get(UNDO_KEY))[UNDO_KEY] ?? [],
  saveRemoved: (games) => chrome.storage.local.set({ [UNDO_KEY]: games }),
});
