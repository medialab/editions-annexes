<script lang="ts">
	import Menu from '$lib/components/menu.svelte';
	import { page } from '$app/state';
	import { getEditionElements } from '$lib/stores';
	let { data } = $props();

	const pageTitle = $derived(`${data.correctEdition.name} | editions annexes`);
	const pageDescription = $derived(
		data.correctEdition.description ||
			data.correctEdition.subtitle ||
			'Edition from editions annexes.'
	);

	const socialImageUrl = 'https://medialab.github.io/annexes-website/og_image.png';
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta name="description" content={pageDescription} />
	<meta property="og:type" content="book" />
	<meta property="og:title" content={pageTitle} />
	<meta property="og:description" content={pageDescription} />
	<meta property="og:url" content={page.url.href} />
	<meta name="twitter:title" content={pageTitle} />
	<meta name="twitter:description" content={pageDescription} />
	{#if socialImageUrl}
		<meta property="og:image" content={socialImageUrl} />
		<meta property="og:image:alt" content={pageTitle} />
		<meta name="twitter:image" content={socialImageUrl} />
	{/if}
</svelte:head>

<Menu currentEdition={data.correctEdition}></Menu>
