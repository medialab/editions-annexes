export type PdfStatus = 'active' | 'archived-old-version';

export type Edition = {
	id: string;
	name: string;
	subtitle: string;
	publishingDate: string;
	isbn: string;
	description: string;
	editors: string[];
	designers: string[];
	contributors: string[];
	keywords: string[];
	parentProject: string;
	downloadHref?: string;
	coPublisher: string;
	parentUrl: string;
	coPublisherUrl: string;
	pdfId: string;
	pdfStatus: PdfStatus;
	pdfRelativePath?: string;
	pdfChecksum?: string;
};

export type DropItem =
	| string
	| {
			id?: string;
			label?: string;
			name?: string;
			title?: string;
	  };

export type MenuVariations = 'book' | 'home' | 'gallery' | 'reader' | 'share';
