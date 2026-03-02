<script lang="ts">
	import { goto } from '$app/navigation';
	let { currentEdition, gridCols } = $props();
	import {
		getEditionDownloadInfo,
		getEditionPages,
		toAssetHref,
		currentPanel,
		currentReaderPage
	} from '$lib/stores';
	import { isExternalHref, preventDefault, hasValue } from '$lib/utils';
	const pagesPromise = $derived(getEditionPages(currentEdition?.name ?? ''));
	const downloadInfo = $derived(getEditionDownloadInfo(currentEdition));
	const editorsText = $derived(formatList(currentEdition?.editors));
	const designersText = $derived(formatList(currentEdition?.designers));
	const contributorsText = $derived(formatList(currentEdition?.contributors));
	const keywordsText = $derived(formatList(currentEdition?.keywords));

	function formatList(values?: string[] | null) {
		if (!values || values.length === 0) return '';
		return values
			.map((value) => value.trim())
			.filter((value) => value.length > 0)
			.join(', ');
	}

	function navigateToPage(pageNum: number) {
		$currentReaderPage = pageNum;
		currentPanel.set('reader');
	}
</script>

<main
	class="flex h-full min-h-0 w-full flex-1 flex-col gap-12 overflow-x-hidden overflow-y-auto rounded-xl p-0 md:flex-row md:gap-4 md:overflow-hidden md:rounded-3xl md:border-2 md:border-solid md:border-neutral-200 md:bg-neutral-100 md:p-4"
>
	<div
		class="h-fit w-full overflow-visible md:h-full md:w-1/2 md:overflow-hidden"
		id="biography-card"
	>
		{#if currentEdition}
			<div
				class="flex h-fit flex-col gap-6 overflow-visible md:h-full md:overflow-y-auto"
				id="bio_list"
			>
				{#if !hasValue(currentEdition.name) && !hasValue(currentEdition.subtitle) && !hasValue(currentEdition.description)}
					<p class="text-neutral-400">missing data</p>
				{/if}
				{#if hasValue(currentEdition.name) || hasValue(currentEdition.subtitle)}
					<div class="hidden flex-col gap-2 md:flex">
						{#if hasValue(currentEdition.name)}
							<h1>{currentEdition.name}</h1>
						{/if}
						{#if hasValue(currentEdition.parentProject)}
							<p>Annex of {currentEdition.parentProject}</p>
						{/if}
					</div>
				{/if}
				{#if hasValue(currentEdition.description)}
					<p>{currentEdition.description}</p>
				{/if}
				<div class="flex-col gap-2 md:flex">
					{#if hasValue(currentEdition.name)}
						<div class="grid grid-cols-[0.5fr_1fr] gap-2 md:grid-cols-[0.3fr_1fr]">
							<p class="col-span-1 text-neutral-400 uppercase">title</p>
							<p class="col-span-1">{currentEdition.name}</p>
						</div>
					{/if}
					{#if hasValue(currentEdition.isbn)}
						<div class="grid grid-cols-[0.5fr_1fr] gap-2 md:grid-cols-[0.3fr_1fr]">
							<p class="col-span-1 text-neutral-400 uppercase">isbn</p>
							<p class="col-span-1">{currentEdition.isbn}</p>
						</div>
					{/if}
					{#if hasValue(currentEdition.publishingDate)}
						<div class="grid grid-cols-[0.5fr_1fr] gap-2 md:grid-cols-[0.3fr_1fr]">
							<p class="col-span-1 text-neutral-400 uppercase">published</p>
							<p class="col-span-1">{currentEdition.publishingDate}</p>
						</div>
					{/if}
					{#if hasValue(currentEdition.coPublisher)}
						<div class="grid grid-cols-[0.5fr_1fr] gap-2 md:grid-cols-[0.3fr_1fr]">
							<p class="col-span-1 text-neutral-400 uppercase">co-publisher</p>
							<p class="col-span-1">{currentEdition.coPublisher}</p>
						</div>
					{/if}
					{#if downloadInfo.href}
						<div class="grid grid-cols-[0.5fr_1fr] gap-2 md:grid-cols-[0.3fr_1fr]">
							<p class="col-span-1 text-neutral-400 uppercase">download</p>
							<a href={downloadInfo.href} download={downloadInfo.filename}>
								<p class="col-span-1 hover:underline hover:underline-offset-2">
									{downloadInfo.filename ?? currentEdition.downloadHref}
								</p>
							</a>
						</div>
					{/if}
					{#if hasValue(editorsText)}
						<div class="grid grid-cols-[0.5fr_1fr] gap-2 md:grid-cols-[0.3fr_1fr]">
							<p class="col-span-1 text-neutral-400 uppercase">editors</p>
							<p class="col-span-1">{editorsText}</p>
						</div>
					{/if}
					{#if hasValue(designersText)}
						<div class="grid grid-cols-[0.5fr_1fr] gap-2 md:grid-cols-[0.3fr_1fr]">
							<p class="col-span-1 text-neutral-400 uppercase">design by</p>
							<p class="col-span-1">{designersText}</p>
						</div>
					{/if}
					{#if hasValue(contributorsText)}
						<div class="grid grid-cols-[0.5fr_1fr] gap-2 md:grid-cols-[0.3fr_1fr]">
							<p class="col-span-1 text-neutral-400 uppercase">contributors</p>
							<p class="col-span-1">{contributorsText}</p>
						</div>
					{/if}
					{#if hasValue(keywordsText)}
						<div class="grid grid-cols-[0.5fr_1fr] gap-2 md:grid-cols-[0.3fr_1fr]">
							<p class="col-span-1 text-neutral-400 uppercase">topic</p>
							<p class="col-span-1">{keywordsText}</p>
						</div>
					{/if}
					{#if hasValue(currentEdition.parentProject)}
						<div class="grid grid-cols-[0.5fr_1fr] gap-2 md:grid-cols-[0.3fr_1fr]">
							<p class="col-span-1 text-neutral-400 uppercase">part of</p>
							{#if currentEdition.parentUrl}
								<a
									href={isExternalHref(currentEdition.parentUrl)
										? currentEdition.parentUrl
										: toAssetHref(currentEdition.parentUrl)}
									id="bio_link"
									class="hover:underline hover:underline-offset-2"
								>
									<p class="col-span-1">{currentEdition.parentProject}</p>
								</a>
							{:else}
								<p class="col-span-1">{currentEdition.parentProject}</p>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>
	<div class="h-fit w-full md:h-full md:w-1/2" id="timone">
		<div
			class="group grid h-full gap-2 overflow-y-scroll p-0 pb-8 transition-opacity duration-300 md:h-full md:p-4 md:pb-0"
			style={`grid-template-columns: repeat(${gridCols}, minmax(0, 1fr));`}
		>
			{#await pagesPromise}
				<p class="col-span-full text-neutral-500">Loading pages...</p>
			{:then pages}
				{#if pages.length === 0}
					<p class="col-span-full text-neutral-500">No pages found.</p>
				{:else}
					{#each pages as page, i}
						<img
							data-hover={`page-${i + 1}`}
							id={`page-${i + 1}`}
							src={page}
							alt=""
							loading="lazy"
							decoding="async"
							class="protected-image col-span-1 h-auto w-full bg-white object-contain transition-all duration-200 group-hover:opacity-20 hover:cursor-help hover:opacity-100!"
							draggable="false"
							oncontextmenu={preventDefault}
							ondragstart={preventDefault}
							oncopy={preventDefault}
							oncut={preventDefault}
							onselectstart={preventDefault}
							onclick={() => navigateToPage(i)}
							role="button"
							tabindex={1}
						/>
					{/each}
				{/if}
			{:catch _error}
				<p class="col-span-full text-red-500">Could not load pages.</p>
			{/await}
		</div>
	</div>
</main>

<style>
	.protected-image {
		-webkit-user-drag: none;
		user-select: none;
		-webkit-user-select: none;
	}

	:global(.bio_link:hover > p) {
		text-decoration: underline;
		text-underline-offset: 2px;
	}
</style>
