import { redirect } from '@sveltejs/kit';
import { destroySession } from '$lib/server/auth';

/** @type {import('./$types').RequestHandler} */
export function POST({ cookies }) {
	const token = cookies.get('session');
	if (token) destroySession(token);

	cookies.delete('session', { path: '/' });

	throw redirect(303, '/login');
}
