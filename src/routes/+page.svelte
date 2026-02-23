<script>
	import Header from '$lib/components/header.svelte';
	import Footer from '$lib/components/footer.svelte';
	import { page } from '$app/state';
	import { asset } from '$app/paths';
	import { allEditions, restCursorText, copyText } from '$lib/stores';
	import Canvas from '$lib/components/canvas.svelte';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	let isPageReady = $state(false);

	const pageTitle = 'editions annexes';
	const pageDescription =
		'Projet editorial du medialab Sciences Po publie en editions annexes: formats de recherche, protocoles, zines et materiaux.';
	const socialImageUrl = 'https://medialab.github.io/annexes-website/og_image.png';

	onMount(() => {
		setTimeout(() => {
			isPageReady = true;
		}, 400);
	});
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta name="description" content={pageDescription} />
	<meta property="og:type" content="website" />
	<meta property="og:title" content={pageTitle} />
	<meta property="og:description" content={pageDescription} />
	<meta property="og:url" content={page.url.href} />
	<meta property="og:image" content={socialImageUrl} />
	<meta property="og:image:alt" content={pageTitle} />
	<meta name="twitter:title" content={pageTitle} />
	<meta name="twitter:description" content={pageDescription} />
	<meta name="twitter:image" content={socialImageUrl} />
</svelte:head>

<div
	class="relative z-10 h-dvh w-full cursor-help overflow-y-scroll md:fixed md:m-0"
	class:showing={isPageReady}
	class:not-showing={!isPageReady}
	data-hover={$restCursorText}
	onclick={() => copyText('annexes@medialab.com')}
	onkeydown={() => copyText('annexes@medialab.com')}
	role="button"
	tabindex="0"
>
	{#if $allEditions}
		<Canvas editions={$allEditions}></Canvas>
	{/if}
</div>

<style>
	.showing {
		transition: opacity 1s ease-in-out;
		opacity: 1;
	}

	.not-showing {
		opacity: 0;
		transition: opacity 1s ease-in-out;
	}
</style>
