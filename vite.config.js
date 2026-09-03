import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');

	// Extra origins allowed to POST forms (CSRF). Comma-separated, e.g.
	// CSRF_TRUSTED_ORIGINS=https://server.rainingdaemons.com,https://vault.example.com
	// Unlike ORIGIN (a single runtime value), this accepts a list of origins.
	const trustedOrigins = (process.env.CSRF_TRUSTED_ORIGINS ?? env.CSRF_TRUSTED_ORIGINS ?? '')
		.split(',')
		.map((origin) => origin.trim())
		.filter(Boolean);

	return {
		plugins: [
			sveltekit({
				compilerOptions: {
					// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
					runes: ({ filename }) =>
						filename.split(/[/\\]/).includes('node_modules') ? undefined : true
				},

				// Self-hosted Node deployment target. Run with `node build` after `pnpm build`.
				adapter: adapter(),

				csrf: {
					trustedOrigins
				}
			}),
			tailwindcss()
		]
	};
});
