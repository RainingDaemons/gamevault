<script>
	let { data } = $props();
</script>

<svelte:head>
	<title>Servers List | Gamevault</title>
</svelte:head>

<div class="markdown">
	{@html data.content}
</div>

<form method="POST" action="/logout" class="mt-12 flex justify-end">
	<button
		type="submit"
		class="rounded border border-zinc-700 px-4 py-2 font-mono text-sm text-zinc-400 transition-colors hover:border-red-500/60 hover:text-red-400"
	>
		[ logout ]
	</button>
</form>
