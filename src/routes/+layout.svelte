<script>
	import favicon from '$lib/assets/favicon.svg';
	import Layout from '$lib/components/Layout.svelte';
	import "$lib/global.css";

	let { children, data } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<Layout owner_name={data.owner_name}>
	{@render children()}
</Layout>
