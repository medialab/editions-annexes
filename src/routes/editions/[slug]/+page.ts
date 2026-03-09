import type { PageLoad } from './$types';
import { activeEditions } from '$lib/data/editions';
import { error } from '@sveltejs/kit';

export function entries() {
	return activeEditions.map((edition) => ({ slug: edition.name }));
}

export const load: PageLoad = ({ params }) => {
	const correctEdition = activeEditions.find((edition) => edition.name === params.slug);

	if (!correctEdition) {
		throw error(404, `Edition not found: ${params.slug}`);
	}

	return {
		correctEdition
	};
};
