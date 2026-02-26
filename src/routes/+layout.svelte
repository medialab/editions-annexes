<script lang="ts">
	import { onMount } from 'svelte';
	import DeviceInfo from 'svelte-device-info';
	import { currentEdition, homeHref, isMobile, isTitleShowing, aboutHref } from '$lib/stores';
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { fly, slide } from 'svelte/transition';
	import { page } from '$app/state';
	import Canvas from '$lib/components/canvas.svelte';
	import { allEditions } from '$lib/stores';
	import CursorPill from '$lib/components/cursor_pill.svelte';
	import { cubicInOut } from 'svelte/easing';
	import annexesIcon from '$lib/assets/icons/annexes.png';
	import { goto } from '$app/navigation';

	let { children } = $props();

	onMount(() => {
		const updateMobileStatus = () => {
			isMobile.set(DeviceInfo.isMobile || window.innerWidth < 768);
		};

		updateMobileStatus();
		window.addEventListener('resize', updateMobileStatus);

		return () => {
			window.removeEventListener('resize', updateMobileStatus);
		};
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{'editions annexes'}</title>
	<meta
		name="description"
		content={'éditions annexes est un projet éditorial qui publie des résultats de recherche en dehors des circuits classiques de l’édition scientifique.'}
	/>
	<link rel="canonical" href={page.url.href} />

	<!-- Open Graph / Facebook -->
	<meta property="og:type" content="website" />
	<meta property="og:url" content={page.url.href} />
	<meta property="og:title" content={'editions annexes'} />
	<meta
		property="og:description"
		content={'éditions annexes est un projet éditorial qui publie des résultats de recherche en dehors des circuits classiques de l’édition scientifique.'}
	/>
	<meta
		property="og:image"
		content="https://github.com/medialab/annexes-website/blob/2180d8a679142225ba8b90d61f424c510d24dcaf/static/og_image.png?raw=true"
	/>
	<meta property="og:site_name" content="editions annexes" />
	<meta property="og:locale" content="fr_FR" />

	<!-- Twitter -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:url" content={page.url.href} />
	<meta name="twitter:title" content={'editions annexes'} />
	<meta
		name="twitter:description"
		content={'éditions annexes est un projet éditorial qui publie des résultats de recherche en dehors des circuits classiques de l’édition scientifique.'}
	/>
	<meta
		name="twitter:image"
		content="https://github.com/medialab/annexes-website/blob/2180d8a679142225ba8b90d61f424c510d24dcaf/static/og_image.png?raw=true"
	/>
</svelte:head>

{#key page.url.pathname}
	<main
		in:slide={{ duration: 500, delay: 100 }}
		out:slide={{ duration: 300 }}
		class="relative z-20"
	>
		{@render children()}
	</main>
{/key}

<a
	href={homeHref}
	onclick={() => goto(homeHref)}
	class="fixed top-4 left-1/2 z-30 mx-auto h-12 w-fit -translate-x-1/2 cursor-alias p-2"
>
	<img src={annexesIcon} alt="annexes logo" class="h-full place-self-center align-middle" />
</a>

<!--
<div
	class="fixed right-0 bottom-4 left-0 z-30 flex h-fit w-full items-center justify-center p-2 text-xl"
>
	<a
		href="#"
		onclick={() => goto(page.url.pathname.includes('about') ? homeHref : aboutHref)}
		class="inline-flex w-fit bg-white p-2"
	>
		{#if page.url.pathname.includes('about')}
			<p class="text-xl">back to editiones annexes</p>
		{:else}
			<p class="text-xl">About Annexes?</p>
		{/if}
	</a>
</div>

<main class="absolute -z-10 flex h-screen h-dvh w-screen w-dvw items-center justify-center md:pointer-events-none">
	{#if $isTitleShowing}
		<div
			class="pointer-events-none absolute z-0 flex h-screen h-dvh w-screen items-center justify-center opacity-20"
		>
			<h1 transition:fly={{ y: 50, duration: 300, easing: cubicInOut }} class="text-6xl">
				{$currentEdition?.name}
			</h1>
		</div>
	{:else}
		<div
			class="flex h-screen h-dvh w-full flex-col items-center justify-start overflow-scroll bg-neutral-100 p-4 py-30 md:h-fit md:w-4/5 md:justify-center md:overflow-hidden md:py-0"
		>
			<h1 class="text-neutral-300" transition:fly={{ y: 50, duration: 300, easing: cubicInOut }}>
				éditions annexes est un projet éditorial qui publie des résultats de recherche en dehors des
				circuits classiques de l’édition scientifique. Il ne prétend pas s’y substituer, mais
				propose de la compléter, en élargissant l’éventail des formats éditoriaux grâce auxquels une
				recherche peut se partager : modes d’emploi, exercices, protocoles, zine, matériau empirique
				brut, poster, etc. éditions annexes propose en retour de s’interroger sur le rôle des
				formats dans l’édition scientifique. L’idée directrice du projet est d’inverser le rapport
				d’importance entre le texte d’une publication et son péritexte (notes de bas de page,
				illustrations et figures, annexes), grâce à un travail d’édition et de design graphique
				adapté à chaque objet. Enfin, ce mode de publication est rapide, peu onéreux et entièrement
				autogéré, permettant ainsi de fabriquer des comptes rendus d’une recherche vivante, en train
				de se faire.
			</h1>
		</div>
	{/if}
</main>-->

<CursorPill></CursorPill>
