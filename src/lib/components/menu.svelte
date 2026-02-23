<script lang="ts">
	import { currentPanel, getEditionDownloadInfo, isMobile } from '$lib/stores';
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

	let { currentEdition } = $props();

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
	class="fixed z-10 flex h-dvh w-screen justify-start md:items-center md:justify-center md:p-12 2xl:p-24"
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
				{#if currentEdition}
					<Button
						label={`Visit the original project page`}
						icon={externalLinkIcon}
						url={currentEdition?.parentUrl}
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
				<div class="flex w-[80%] flex-col gap-0 text-wrap">
					<h1>{currentEdition.name}</h1>
					<p>{currentEdition.subtitle}</p>
				</div>
				<a
					href={downloadInfo.href}
					download={downloadInfo.filename}
					class="place-items-center p-2 opacity-50"
				>
					<img src={downloadIcon} alt="Download" />
				</a>
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
				<Button
					label="Download"
					icon={downloadIcon}
					url={downloadInfo.href}
					download={downloadInfo.filename}
				></Button>
				<!--
				{#if $currentPanel === 'book'}
					<div class="flex w-full items-center justify-center">
						<label
							class="flex w-2/5 flex-row items-center justify-center gap-3 rounded-xl bg-neutral-100 px-4 py-2 text-nowrap"
						>
							<p>Zoom x {gridColsNum}</p>
							<input
								class="h-1.5 w-full appearance-none rounded-full bg-blue-600 px-4 outline-none [&::-moz-range-thumb]:h-[0.9rem] [&::-moz-range-thumb]:w-[0.9rem] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-blue-700 [&::-moz-range-thumb]:bg-blue-400 [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-blue-600 [&::-webkit-slider-thumb]:h-[0.9rem] [&::-webkit-slider-thumb]:w-[0.9rem] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-700 [&::-webkit-slider-thumb]:bg-blue-400"
								type="range"
								min="1"
								max="10"
								step="1"
								bind:value={gridColsNum}
								aria-label="Number of grid columns"
							/>
						</label>
					</div>
				{/if}-->
				<Button label="Share" icon={shareIcon} href={homeHref}></Button>
			</footer>
		</div>
	</div>

	<button
		id="bg_drop"
		class="fixed z-0 h-dvh w-dvw cursor-alias bg-[#F5F5F5] opacity-100 md:opacity-80"
		onclick={() => goto(homeHref)}
		aria-label="Close menu"
		tabindex="0"
	></button>
</section>
