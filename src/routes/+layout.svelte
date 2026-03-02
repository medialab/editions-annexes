<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import DeviceInfo from 'svelte-device-info';
	import { homeHref, isMobile } from '$lib/stores';
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { fly, slide } from 'svelte/transition';
	import { page } from '$app/state';
	import Canvas from '$lib/components/canvas.svelte';
	import { allEditions } from '$lib/stores';
	import CursorPill from '$lib/components/cursor_pill.svelte';
	import { cubicInOut } from 'svelte/easing';
	import annexesIcon from '$lib/assets/icons/annexes.png';
	import { goto } from '$app/navigation';

	let { children } = $props();

	onMount(() => {
		if (!browser) return;

		const updateMobileStatus = () => {
			isMobile.set(DeviceInfo.isMobile || window.innerWidth < 768);
		};

		updateMobileStatus();
		window.addEventListener('resize', updateMobileStatus);

		return () => {
			window.removeEventListener('resize', updateMobileStatus);
		};
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#key page.url.pathname}
	<main
		in:slide={{ duration: 500, delay: 100 }}
		out:slide={{ duration: 300 }}
		class="relative z-20"
	>
		{@render children()}
	</main>
{/key}

<a
	href={homeHref}
	onclick={() => goto(homeHref)}
	class="fixed top-4 left-1/2 z-0 mx-auto h-12 w-fit -translate-x-1/2 cursor-alias p-2 md:z-30"
>
	<img src={annexesIcon} alt="annexes logo" class="h-full place-self-center align-middle" />
</a>

<CursorPill></CursorPill>
