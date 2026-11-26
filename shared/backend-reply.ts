import type { FetchLike } from "./steam-api";

/**
 * Turns the Millennium backend's reply into the response `scan` expects.
 * The backend sends JSON text, but Millennium can hand it to the page already
 * decoded, so both forms are accepted.
 */
export function backendResponse(reply: unknown): Awaited<ReturnType<FetchLike>> {
  const decode = (value: unknown): any => (typeof value === "string" ? JSON.parse(value) : value);
  const { status, body } = decode(reply);
  return { ok: status === 200, status, json: async () => decode(body) };
}
