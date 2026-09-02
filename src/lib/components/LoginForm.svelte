<script>
	/** @type {{ error?: string | null }} */
	let { error = null } = $props();
</script>

<form method="POST" class="space-y-4">
	<label for="password" class="block font-mono text-xs uppercase tracking-widest text-zinc-400">
		Password
	</label>

	<input
		id="password"
		name="password"
		type="password"
		required
		autocomplete="current-password"
		placeholder="••••••••••••"
		class="w-full rounded border border-zinc-700 bg-zinc-900/60 px-4 py-3 font-mono text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-500/70"
	/>

	<button
		type="submit"
		class="w-full rounded border border-emerald-500/50 bg-emerald-500/10 px-4 py-3 font-mono text-sm tracking-widest text-emerald-300 transition-colors hover:bg-emerald-500/20"
	>
		[ unlock ]
	</button>

	{#if error}
		<p class="rounded border border-red-500/40 bg-red-500/10 px-4 py-2 font-mono text-sm text-red-400">
			{error}
		</p>
	{/if}
</form>
