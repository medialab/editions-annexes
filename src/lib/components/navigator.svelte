<script lang="ts">
	import type { MenuVariations } from '$lib/types';
	import { currentEdition, currentPanel, isMobile } from '$lib/stores';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import shareIcon from '$lib/assets/icons/share.svg';
	import { page } from '$app/state';

	import bookIcon from '$lib/assets/icons/book.svg';
	import galleryIcon from '$lib/assets/icons/gallery.svg';
	import readerIcon from '$lib/assets/icons/reader.svg';
	import homeIcon from '$lib/assets/icons/homeIcon.svg';
	import { hasValue, webShareApi } from '$lib/utils';

	const navItems: { panel: MenuVariations; icon: string; label: string }[] = [
		{ panel: 'share', icon: shareIcon, label: 'Share' },
		{ panel: 'book', icon: bookIcon, label: 'Book' },
		{ panel: 'gallery', icon: galleryIcon, label: 'Gallery' },
		{ panel: 'reader', icon: readerIcon, label: 'Reader' },

		{ panel: 'home', icon: homeIcon, label: 'Home' }
	];
	const homeHref = resolve('/');

	const setPanel = (panel: MenuVariations) => {
		if (panel === 'home') {
			goto(homeHref);
		} else if (panel === 'share') {
			if ($isMobile && $currentEdition) {
				webShareApi($currentEdition.name, page.url.href, $currentEdition?.parentProject);
			} else {
				console.log('currentEdition', $currentEdition);
			}
		} else {
			$currentPanel = panel;
		}
	};
</script>

<div
	id="navigator"
	class="left-4 flex flex-row items-center justify-between rounded-2xl border-solid border-neutral-200 bg-white p-2 md:relative md:inset-auto md:mx-0 md:h-fit md:w-fit md:flex-col md:items-center md:justify-center md:gap-2 md:border"
>
	{#each navItems as item}
		<button
			type="button"
			class="nav-button h-full w-fit items-center justify-center gap-2 rounded-xl {$currentPanel ===
			item.panel
				? 'px-4 py-3 md:p-3'
				: 'p-3'}"
			onclick={() => setPanel(item.panel)}
			class:active={$currentPanel === item.panel}
			class:home-button={item.panel === 'home'}
			class:share-button={item.panel === 'share'}
			class:back={$currentPanel === 'home'}
			aria-label={item.label}
			title={item.label}
			data-hover={item.label}
		>
			<img
				src={item.icon}
				alt={item.label}
				class="h-full w-auto opacity-85 mix-blend-darken"
				class:active={$currentPanel === item.panel}
			/>
			{#if $currentPanel === item.panel && item.panel !== 'share'}
				<p
					class="block place-self-center align-middle font-medium text-[#005792] hover:no-underline md:hidden"
				>
					{item.label}
				</p>
			{/if}
		</button>
	{/each}
</div>

<style>
	.nav-button {
		transition: background-color 150ms ease-in-out;
	}

	.nav-button img {
		transition: filter 150ms ease-in-out;
	}

	.nav-button:is(:hover, .active) {
		background-color: #e9f6ff;
	}

	.nav-button.home-button {
		background-color: #ffd9d9 !important;
		opacity: 1 !important;
	}

	.nav-button.home-button:hover {
		background-color: #e69e9e !important;
		opacity: 1 !important;
	}

	.nav-button.share-button {
		background-color: #ffffff !important;
	}

	.nav-button.home-button > img:not(.active) {
		opacity: 1;
		filter: hue-rotate(120deg);
	}

	img:not(.active) {
		filter: saturate(0%);
	}

	.nav-button:not(:is(:hover, .active)) {
		background-color: rgb(247, 247, 247);
	}

	.nav-button:not(:is(:hover, .active)) img {
		opacity: 0.2;
	}

	/* Hide share button on desktop since it only works on mobile */
	@media (min-width: 768px) {
		.nav-button.share-button {
			display: none;
		}
	}
</style>
