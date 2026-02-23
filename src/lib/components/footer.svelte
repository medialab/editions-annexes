<script lang="ts">
	import { isFooterOpen, hideFooter } from '$lib/stores';
	import { slide } from 'svelte/transition';
	import { cubicInOut } from 'svelte/easing';
</script>

{#if $hideFooter}
	<!-- Footer hidden -->
{:else}
	<!-- DnD disabled for now; footer kept as informational UI only. -->
	<footer
		class="fixed right-4 bottom-6 left-4 z-30 hidden h-fit items-center justify-center gap-3 rounded-2xl bg-white/95 p-2 backdrop-blur transition-all duration-300 ease-in-out md:right-auto md:left-1/2 md:flex md:w-full md:max-w-[60%] md:-translate-x-1/2"
		class:open={$isFooterOpen === true}
		transition:slide={{ duration: 300, axis: 'y', easing: cubicInOut }}
	>
		<div
			class=" min-h-[44px] border-2 border-dashed border-neutral-200 bg-neutral-50 px-6 {$isFooterOpen
				? 'h-[300px] w-full!'
				: ''} pill transition-all duration-300 ease-in-out"
		>
			{#if !$isFooterOpen}
				<p>Click a book to open</p>
			{:else}
				<p>Opening selected book</p>
			{/if}
		</div>
	</footer>
{/if}
