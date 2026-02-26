import type { PageLoad } from './$types';
import { editions } from '$lib/data/datasource';

export const load: PageLoad = () => {
	return {
		editions,
		title: 'editions annexes',
		description:
			'Projet editorial du medialab Sciences Po publie en editions annexes: formats de recherche, protocoles, zines et materiaux.'
	};
};
