// api.steampowered.com is cross-origin for the store page, so those requests run here.
import { scan } from "../shared/steam-api";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "scan") return false;
  const fetchPublic = (url) => fetch(url, { credentials: "omit" });
  scan(message.token, fetchPublic, message.options).then(
    (result) => sendResponse({ ok: true, result }),
    (error) => sendResponse({ ok: false, error: error.message }),
  );
  return true; // keep the channel open for the async reply
});
