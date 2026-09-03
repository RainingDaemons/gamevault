import { fail, redirect } from '@sveltejs/kit';
import {
	createSession,
	isRateLimited,
	recordFailedAttempt,
	resetRateLimit,
	verifyPassword
} from '$lib/server/auth';

/** @type {number} session lifetime in seconds (7 days) */
const SESSION_TTL = 60 * 60 * 24 * 7;

/** @type {import('./$types').PageServerLoad} */
export function load({ locals }) {
	if (locals.authenticated) {
		throw redirect(303, '/');
	}
	return {};
}

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request, url, cookies, getClientAddress }) => {
		const ip = getClientAddress();

		if (isRateLimited(ip)) {
			return fail(429, { error: 'Too many attempts. Try again later.' });
		}

		const data = await request.formData();
		const password = String(data.get('password') ?? '');

		if (!(await verifyPassword(password))) {
			recordFailedAttempt(ip);
			return fail(401, { error: 'Incorrect password.' });
		}

		resetRateLimit(ip);

		const token = createSession();

		// Only mark the cookie `Secure` when the client actually reaches us over
		// HTTPS. Trust the proxy's forwarded proto when present (Caddy/Traefik/
		// cloudflared); otherwise fall back to the request protocol, which
		// adapter-node derives from ORIGIN.
		const forwarded_proto = request.headers.get('x-forwarded-proto');
		const secure = forwarded_proto
			? forwarded_proto.split(',')[0].trim() === 'https'
			: url.protocol === 'https:';

		cookies.set('session', token, {
			httpOnly: true,
			secure,
			sameSite: 'strict',
			path: '/',
			maxAge: SESSION_TTL
		});

		throw redirect(303, '/');
	}
};
