// Same-origin requests for code running on a store.steampowered.com page.
import type { WishlistAction } from "./change-many";

export async function getToken(): Promise<string> {
  const res = await fetch("/pointssummary/ajaxgetasyncconfig", { credentials: "include" });
  if (!res.ok) throw new Error(`Couldn't read your Steam session (HTTP ${res.status}).`);
  const token = (await res.json())?.data?.webapi_token;
  if (!token) throw new Error("Sign in to the Steam store, then try again.");
  return token;
}

export async function changeWishlist(action: WishlistAction, appid: number): Promise<boolean> {
  const sessionid = document.cookie.match(/(?:^|;\s*)sessionid=([^;]+)/)?.[1];
  if (!sessionid) return false;
  const res = await fetch(`/api/${action}`, {
    method: "POST",
    credentials: "include",
    body: new URLSearchParams({ sessionid, appid: String(appid) }),
  });
  if (!res.ok) return false;
  return Boolean((await res.json())?.success);
}
