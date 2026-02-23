<script lang="ts">
	import { getEditionPages } from '$lib/stores';
	import { isMobile, currentReaderPage } from '$lib/stores';
	import { preventDefault } from '$lib/utils';

	import arrowLeft from '$lib/assets/icons/arrowLeft.svg';
	import arrowRight from '$lib/assets/icons/arrowRight.svg';

	let { currentEdition } = $props();

	const pagesPromise = $derived(getEditionPages(currentEdition?.name ?? ''));

	function nextPage(totalPages: number) {
		if ($currentReaderPage + 1 < totalPages) $currentReaderPage += 1;
	}

	function prevPage() {
		if ($currentReaderPage - 1 >= 0) $currentReaderPage -= 1;
	}

	$effect(() => {
		currentEdition?.name;
	});
</script>

<main class="viewer_main mx-auto h-full w-full">
	{#await pagesPromise}
		<div class="col-span-3 flex h-full items-center justify-center">
			<p class=" text-neutral-500">Loading pages...</p>
		</div>
	{:then pages}
		{@const pagesPerView = $isMobile ? 1 : 2}
		{@const visiblePages = pages.slice($currentReaderPage, $currentReaderPage + pagesPerView)}
		<button
			id="arrow_left"
			class="arrows col-start-1 row-start-2 md:col-start-auto md:row-start-auto"
			onclick={prevPage}
			disabled={$currentReaderPage <= 0}
			data-hover="Previous page"
		>
			<img src={arrowLeft} alt="Arrow Left" class="" />
		</button>

		<div
			id="gallery"
			class="z-0 col-span-2 flex h-full min-h-0 w-full items-stretch justify-center md:col-span-1"
		>
			{#if pages.length === 0}
				<p class=" text-neutral-500">No pages found.</p>
			{:else}
				<div class="grid h-full min-h-0 w-fit grid-cols-1 items-stretch md:grid-cols-2">
					{#each visiblePages as page}
						<div
							class="col-span-1 flex h-full min-h-0 w-fit items-center justify-center md:bg-transparent md:py-4"
						>
							<img
								src={page}
								alt=""
								loading="lazy"
								decoding="async"
								class="protected-image z-0 h-full object-contain md:rounded-none md:border-0"
								draggable="false"
								oncontextmenu={preventDefault}
								ondragstart={preventDefault}
								oncopy={preventDefault}
								oncut={preventDefault}
								onselectstart={preventDefault}
							/>
						</div>
					{/each}
				</div>
			{/if}
		</div>
		<button
			id="arrow_right"
			class="arrows col-start-2 row-start-2 md:col-start-auto md:row-start-auto"
			onclick={() => nextPage(pages.length)}
			disabled={$currentReaderPage + 1 >= pages.length}
			data-hover="Next page"
		>
			<img src={arrowRight} alt="Arrow Right" class="" />
		</button>
	{:catch _error}
		<div class="col-span-3 flex items-center justify-center">
			<p class=" text-red-500">Could not load pages.</p>
		</div>
	{/await}
</main>

<style>
	.protected-image {
		-webkit-user-drag: none;
		user-select: none;
		-webkit-user-select: none;
	}
</style>
