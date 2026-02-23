<script>
	import Header from '$lib/components/header.svelte';
	import Footer from '$lib/components/footer.svelte';
	import { page } from '$app/state';
	import { asset } from '$app/paths';
	import { allEditions, restCursorText, copyText, currentEdition } from '$lib/stores';
	import Canvas from '$lib/components/canvas.svelte';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { cubicInOut } from 'svelte/easing';
	import { fly } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { homeHref } from '$lib/stores';

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

	$inspect('currentEdition:', $currentEdition);
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
	onclick={() => copyText('axel.meunier@sciencespo.fr, donato.ricci@sciencespo.fr')}
	onkeydown={() => copyText('axel.meunier@sciencespo.fr, donato.ricci@sciencespo.fr')}
	role="button"
	tabindex="0"
>
	{#if $allEditions}
		<Canvas editions={$allEditions}></Canvas>
	{/if}
</div>

<main
	class="fixed z-[-10] flex h-dvh w-dvw items-center justify-center"
	id="about_text"
	class:opacized={$currentEdition !== null}
>
	<div
		class="z-10 flex h-full w-full flex-col items-start justify-start gap-4 overflow-scroll bg-neutral-100 p-4 py-30 text-neutral-200 md:h-fit md:w-4/5 md:justify-center md:overflow-hidden md:py-0"
	>
		<h1
			class=""
			in:fly={{ y: 50, duration: 300, easing: cubicInOut, delay: 0 }}
			out:fly={{ y: 50, duration: 300, easing: cubicInOut, delay: 200 }}
		>
			<span
				class="cursor-pointer text-neutral-500"
				data-hover={$restCursorText}
				onclick={() => copyText('annexes@medialab.com')}
				onkeydown={() => copyText('annexes@medialab.com')}
				role="button"
				tabindex="0">éditions annexes</span
			>
			est un projet éditorial qui publie des résultats de recherche en dehors des circuits classiques
			de l’édition scientifique. Il ne prétend pas s’y substituer, mais propose de la compléter, en élargissant
			l’éventail des formats éditoriaux grâce auxquels une recherche peut se partager : modes d’emploi,
			exercices, protocoles, zine, matériau empirique brut, poster, etc.
			<span
				class="cursor-pointer text-neutral-500"
				data-hover={$restCursorText}
				onclick={() => copyText('annexes@medialab.com')}
				onkeydown={() => copyText('annexes@medialab.com')}
				role="button"
				tabindex="0">éditions annexes</span
			> propose en retour de s’interroger sur le rôle des formats dans l’édition scientifique. L’idée
			directrice du projet est d’inverser le rapport d’importance entre le texte d’une publication et
			son péritexte (notes de bas de page, illustrations et figures, annexes), grâce à un travail d’édition
			et de design graphique adapté à chaque objet. Enfin, ce mode de publication est rapide, peu onéreux
			et entièrement autogéré, permettant ainsi de fabriquer des comptes rendus d’une recherche vivante,
			en train de se faire.
		</h1>
		<h2>
			We are always looking for new experimental collaborations. Please <span
				class="cursor-pointer text-neutral-500"
				data-hover={$restCursorText}
				onclick={() => copyText('annexes@medialab.com')}
				onkeydown={() => copyText('annexes@medialab.com')}
				role="button"
				tabindex="0">drop a message</span
			> if you are interested in publishing with us
		</h2>
	</div>

	<button
		class="absolute z-0 h-full w-full cursor-alias"
		onclick={() => goto(homeHref)}
		onkeydown={(e) => e.key === 'Escape' && goto(homeHref)}
		role="button"
		tabindex="0"
	>
	</button>
</main>

<style>
	.showing {
		transition: opacity 1s ease-in-out;
		opacity: 1;
	}

	.not-showing {
		opacity: 0;
		transition: opacity 1s ease-in-out;
	}

	.opacized {
		opacity: 0.1;
		transition:
			opacity 0.6s ease-in-out,
			filter 0.6s ease-in-out;
		filter: blur(10px);
	}

	:not(.opacized) {
		transition:
			opacity 0.6s ease-in-out,
			filter 0.6s ease-in-out;
		filter: blur(0);
	}
</style>
