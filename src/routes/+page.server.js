import { redirect } from '@sveltejs/kit';
import { getCompiledContent } from '$lib/server/content';

// Never prerender: this route's content depends on the session and must not be
// baked into static output that could reach an unauthenticated visitor.
export const prerender = false;

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals }) {
	if (!locals.authenticated) {
		throw redirect(303, '/login');
	}

	const content = await getCompiledContent();
	return { content };
}
