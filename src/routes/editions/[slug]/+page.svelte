<script lang="ts">
	import Menu from '$lib/components/menu.svelte';
	import { page } from '$app/state';
	import { getEditionElements, currentEdition } from '$lib/stores';
	import { hasValue } from '$lib/utils';
	let { data } = $props();

	$effect(() => {
		if (data.correctEdition && page.url.pathname.includes('/editions')) {
			$currentEdition = data.correctEdition;
		}
	});

	const pageTitle = $derived(
		hasValue(data.correctEdition?.name)
			? `${data.correctEdition.name} | editions annexes`
			: 'editions annexes'
	);
	const pageDescription = $derived(
		hasValue(data.correctEdition?.description)
			? data.correctEdition.description
			: hasValue(data.correctEdition?.subtitle)
				? data.correctEdition.subtitle
				: 'Edition from editions annexes.'
	);
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta name="description" content={pageDescription} />
</svelte:head>

{#if data.correctEdition}
	<Menu currentEdition={data.correctEdition}></Menu>
{:else}
	<div class="flex h-screen w-screen items-center justify-center">
		<p class="text-neutral-500">Edition not found</p>
	</div>
{/if}
