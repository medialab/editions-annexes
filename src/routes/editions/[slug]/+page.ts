import type { PageLoad } from './$types';
import { editions } from '$lib/data/datasource';
import { error } from '@sveltejs/kit';

export function entries() {
	return editions.map((edition) => ({ slug: edition.name }));
}

export const load: PageLoad = ({ params }) => {
	const correctEdition = editions.find((edition) => edition.name === params.slug);

	if (!correctEdition) {
		throw error(404, `Edition not found: ${params.slug}`);
	}

	return {
		correctEdition
	};
};
