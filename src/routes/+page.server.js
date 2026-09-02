import { redirect } from '@sveltejs/kit';
import { getCompiledContent } from '$lib/server/content';

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals }) {
	if (!locals.authenticated) {
		throw redirect(303, '/login');
	}

	const content = await getCompiledContent();
	return { content };
}
