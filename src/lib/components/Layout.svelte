<script>
	let { children, owner_name } = $props();
</script>

<div class="min-h-screen bg-zinc-950 text-zinc-200 antialiased">
	<header class="border-b border-zinc-800/80">
		<div class="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
			<a href="/" class="font-mono text-sm tracking-widest text-emerald-400">Gamevault</a>
			<span class="font-mono text-[10px] uppercase tracking-widest text-zinc-600">{owner_name}'s vault</span>
		</div>
	</header>

	<main class="mx-auto max-w-3xl px-6 py-10">
		{@render children()}
	</main>
</div>
