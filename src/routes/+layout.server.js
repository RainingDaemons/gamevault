import { env } from '$env/dynamic/private';

/** @type {import('./$types').LayoutServerLoad} */
export function load() {
	return { owner_name: env.owner_name ?? '' };
}
