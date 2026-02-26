<script>
	import Header from '$lib/components/header.svelte';
	import Footer from '$lib/components/footer.svelte';
	import { page } from '$app/state';
	import { asset } from '$app/paths';
	import { cubicInOut } from 'svelte/easing';
	import { fly } from 'svelte/transition';
	import { copyText, homeHref, restCursorText } from '$lib/stores';
	import { goto } from '$app/navigation';

	const pageTitle = 'About | editions annexes';
	const pageDescription =
		'Presentation du projet editions annexes: publier la recherche hors des formats editoriaux scientifiques classiques.';
	const socialImageUrl = 'https://medialab.github.io/annexes-website/og_image.png';
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta name="description" content={pageDescription} />
	<meta property="og:type" content="website" />
	<meta property="og:title" content={pageTitle} />
	<meta property="og:description" content={pageDescription} />
	<meta property="og:url" content={page.url.href} />
	<meta property="og:image:alt" content={pageTitle} />
	<meta name="twitter:title" content={pageTitle} />
	<meta name="twitter:description" content={pageDescription} />
	<meta property="og:image" content="og_image.png" />
	<meta name="twitter:image" content="og_image.png" />
</svelte:head>

<main
	class="fixed -z-10 flex h-dvh h-screen w-dvw w-screen items-center justify-center"
	id="about_text"
>
	<div
		class="z-10 flex h-full w-full flex-col items-center justify-start overflow-scroll bg-neutral-100 p-4 py-30 md:h-fit md:w-4/5 md:justify-center md:overflow-hidden md:py-0"
	>
		<h1
			class="text-neutral-400"
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
