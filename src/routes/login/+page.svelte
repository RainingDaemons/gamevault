<script>
	import LoginForm from '$lib/components/LoginForm.svelte';

	let { form } = $props();
</script>

<svelte:head>
	<title>Login | Gamevault</title>
</svelte:head>

<div class="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center">
	<div class="mb-8 text-center">
		<h1 class="font-mono text-2xl tracking-widest text-emerald-400">GAME SERVERS LIST</h1>
		<p class="mt-2 font-mono text-xs text-zinc-500">Enter the master password to unlock the server list</p>
	</div>

	<LoginForm error={form?.error ?? null} />
</div>
