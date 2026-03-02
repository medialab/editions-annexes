<script lang="ts">
	import { currentPanel, getEditionDownloadInfo, isMobile } from '$lib/stores';
	import { webShareApi, hasValue } from '$lib/utils';
	import Button from './button.svelte';
	import { slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	import closeIcon from '$lib/assets/icons/close.svg';
	import downloadIcon from '$lib/assets/icons/download.svg';
	import shareIcon from '$lib/assets/icons/share.svg';
	import externalLinkIcon from '$lib/assets/icons/external_link.svg';

	import MenuBio from './menu_bio.svelte';
	import MenuGallery from './menu_gallery.svelte';
	import MenuReader from './menu_reader.svelte';
	import Navigator from './navigator.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { page } from '$app/state';

	let { currentEdition } = $props();

	$inspect('currnetedition thumb:', currentEdition);

	let gridColsNum = $state(6);
	const homeHref = resolve('/');
	const downloadInfo = $derived(getEditionDownloadInfo(currentEdition));

	onMount(() => {
		if ($isMobile) {
			gridColsNum = 2;
		}
	});
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && goto(homeHref)} />

<section
	class="fixed z-10 flex h-screen w-screen justify-start supports-[height:100dvh]:h-dvh md:items-center md:justify-center md:p-12 2xl:p-24"
	transition:slide={{ duration: 500, easing: cubicOut, axis: 'y' }}
>
	<div
		class="z-2 flex w-full origin-center flex-col-reverse justify-center gap-4 px-4 py-4 text-[#444444] md:h-full md:max-w-[60%] md:flex-row md:px-0 xl:max-w-[80%]"
	>
		{#if $currentPanel}
			<Navigator></Navigator>
		{/if}
		<div
			id="viewer"
			class="flex h-full w-full flex-1 flex-col items-start justify-start gap-0 overflow-hidden border-0 pt-4 md:h-full md:items-center md:gap-4 md:rounded-2xl md:border md:border-neutral-200 md:bg-white md:p-4 md:pb-4"
		>
			<header class="hidden h-fit w-full items-center justify-between md:flex">
				{#if currentEdition && hasValue(currentEdition.parentUrl)}
					<Button
						label={`Visit the original project page`}
						icon={externalLinkIcon}
						url={currentEdition.parentUrl}
					></Button>
				{/if}
				<Button
					label="Close"
					icon={closeIcon}
					urgency="urgent"
					onClick={() => {
						goto(homeHref);
					}}
				></Button>
			</header>
			<div class="mb-4 flex h-fit w-full flex-none items-start justify-between md:hidden">
				<div class="flex w-[80%] flex-col gap-2 text-wrap md:gap-0">
					{#if hasValue(currentEdition?.name)}
						<h1>{currentEdition.name}</h1>
					{:else}
						<h1 class="text-neutral-400">missing data</h1>
					{/if}
					{#if hasValue(currentEdition?.subtitle)}
						<p>{currentEdition.subtitle}</p>
					{:else}
						<p class="text-neutral-400">missing data</p>
					{/if}
				</div>
				{#if downloadInfo.href}
					<a
						href={downloadInfo.href}
						download={downloadInfo.filename}
						class="place-items-center p-2 opacity-50"
					>
						<img src={downloadIcon} alt="Download" />
					</a>
				{/if}
			</div>

			<div class="h-full min-h-0 w-full flex-1">
				{#if $currentPanel === 'book'}
					<MenuBio {currentEdition} gridCols={11 - gridColsNum} />
				{:else if $currentPanel === 'gallery'}
					<MenuGallery {currentEdition} />
				{:else if $currentPanel === 'reader'}
					<MenuReader {currentEdition} />
				{/if}
			</div>
			<footer class="hidden h-fit w-full items-center justify-between md:flex">
				{#if downloadInfo.href}
					<Button
						label="Download"
						icon={downloadIcon}
						url={downloadInfo.href}
						download={downloadInfo.filename}
					></Button>
				{/if}
				{#if hasValue(currentEdition?.name)}
					<Button
						label="Share"
						icon={shareIcon}
						onClick={() =>
							webShareApi(currentEdition.name, page.url.href, currentEdition.parentProject)}
					></Button>
				{/if}
			</footer>
		</div>
	</div>

	<button
		id="bg_drop"
		class="fixed z-0 h-dvh h-screen w-dvw w-screen cursor-alias bg-[#F5F5F5] opacity-100 md:opacity-80"
		onclick={() => goto(homeHref)}
		aria-label="Close menu"
		tabindex="0"
	></button>
</section>
