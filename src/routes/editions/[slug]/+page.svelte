<script lang="ts">
	import Menu from '$lib/components/menu.svelte';
	import { page } from '$app/state';
	import { getEditionElements } from '$lib/stores';
	let { data } = $props();

	const pageTitle = $derived(`${data.correctEdition.name} | editions annexes`);
	const pageDescription = $derived(
		data.correctEdition.description ||
			data.correctEdition.subtitle ||
			'Edition from editions annexes.'
	);
</script>

<Menu currentEdition={data.correctEdition}></Menu>
