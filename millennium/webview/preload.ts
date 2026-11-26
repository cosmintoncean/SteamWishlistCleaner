// Runs on Steam web pages inside the client. Shows the panel on the wishlist page only.
import { mountPanel } from '../../shared/panel';
import { scan, type FetchLike, type Game } from '../../shared/steam-api';
import { changeWishlist, getToken } from '../../shared/store-page';

const UNDO_KEY = 'sfwc-lastRemoved';
const OPTIONS_KEY = 'sfwc-options';

const fetchViaBackend: FetchLike = async (url) => {
	const { status, body } = JSON.parse(await backend.steam_get(url));
	return { ok: status === 200, status, json: async () => JSON.parse(body) };
};

export default async function main() {
	if (location.hostname !== 'store.steampowered.com') return;
	if (!location.pathname.startsWith('/wishlist')) return;

	mountPanel({
		scan: async (options) => scan(await getToken(), fetchViaBackend, options),
		loadOptions: async () => JSON.parse(localStorage.getItem(OPTIONS_KEY) ?? 'null') ?? undefined,
		saveOptions: async (options) => localStorage.setItem(OPTIONS_KEY, JSON.stringify(options)),
		change: changeWishlist,
		loadRemoved: async (): Promise<Game[]> => JSON.parse(localStorage.getItem(UNDO_KEY) ?? '[]'),
		saveRemoved: async (games) => localStorage.setItem(UNDO_KEY, JSON.stringify(games)),
	});
}
