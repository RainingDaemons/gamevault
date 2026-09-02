import { verifySession } from '$lib/server/auth';

/** @type {import('@sveltejs/kit').Handle} */
export function handle({ event, resolve }) {
	const token = event.cookies.get('session');
	const sessionId = verifySession(token);

	event.locals.authenticated = sessionId !== null;
	event.locals.sessionId = sessionId;

	// Cheap extra against public indexing; not a security boundary.
	event.setHeaders({ 'X-Robots-Tag': 'noindex, nofollow' });

	return resolve(event);
}
