<script lang="ts">
	import { getEditionGalleryImages } from '$lib/stores';
	import { preventDefault, hasValue } from '$lib/utils';
	import { fade } from 'svelte/transition';

	let { currentEdition } = $props();

	import arrowLeft from '$lib/assets/icons/arrowLeft.svg';
	import arrowRight from '$lib/assets/icons/arrowRight.svg';

	let currentIndex = $state(0);
	const imagesPromise = $derived(getEditionGalleryImages(currentEdition?.name));

	function nextImage(total: number) {
		currentIndex = (currentIndex + 1) % total;
	}

	function prevImage(total: number) {
		currentIndex = (currentIndex - 1 + total) % total;
	}

	$effect(() => {
		currentEdition?.name;
		currentIndex = 0;
	});
</script>

<main class="viewer_main h-full">
	{#if !currentEdition || !hasValue(currentEdition.name)}
		<div class="flex h-full items-center justify-center">
			<p class="text-neutral-400">missing data</p>
		</div>
	{:else}
		{#await imagesPromise}
			<div class="col-span-3 flex h-full items-center justify-center">
				<p class=" text-neutral-500">Loading gallery...</p>
			</div>
		{:then images}
			{#if images.length > 0}
				<button
					id="arrow_left"
					type="button"
					class="arrows col-start-1 row-start-2 md:col-start-auto md:row-start-auto"
					data-hover="Previous image"
					onclick={() => prevImage(images.length)}
				>
					<img src={arrowLeft} alt="Arrow Left" class="" />
				</button>
				<div
					id="gallery"
					class="col-span-2 row-start-1 flex h-full min-h-0 w-full items-center justify-center md:col-span-1 md:row-start-auto md:py-4"
				>
					{#key currentIndex}
						<img
							src={images[currentIndex]}
							alt="Gallery item"
							in:fade={{ duration: 200 }}
							class="protected-image h-full w-full max-w-full overflow-hidden rounded-2xl object-cover"
							draggable="false"
							oncontextmenu={preventDefault}
							ondragstart={preventDefault}
							oncopy={preventDefault}
							oncut={preventDefault}
							onselectstart={preventDefault}
						/>
					{/key}
				</div>
				<button
					id="arrow_right"
					type="button"
					class="arrows col-start-2 row-start-2 md:col-start-auto md:row-start-auto"
					data-hover="Next image"
					onclick={() => nextImage(images.length)}
				>
					<img src={arrowRight} alt="Arrow Right" class="" />
				</button>
			{:else}
				<div class="col-span-3 flex h-full items-center justify-center">
					<p class=" text-neutral-500">No images found in gallery.</p>
				</div>
			{/if}
		{:catch error}
			<div class="col-span-3 flex h-full items-center justify-center">
				<p class=" text-red-500">Error loading gallery.</p>
			</div>
		{/await}
	{/if}
</main>

<style>
	.protected-image {
		-webkit-user-drag: none;
		user-select: none;
		-webkit-user-select: none;
	}
</style>
