import type { PageLoad } from './$types';
import { activeEditions } from '$lib/data/editions';

export const load: PageLoad = () => {
	return {
		editions: activeEditions,
		title: 'editions annexes',
		description:
			'Projet editorial du medialab Sciences Po publie en editions annexes: formats de recherche, protocoles, zines et materiaux.'
	};
};
