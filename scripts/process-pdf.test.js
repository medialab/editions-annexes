import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import test from 'node:test';
import vm from 'vm';

import { PDF_STATUS_ACTIVE, PDF_STATUS_ARCHIVED, syncPdfLibrary } from './process-pdf.js';

function createTempWorkspace() {
	const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-sync-'));
	const pdfSourceDir = path.join(rootDir, 'static', 'pdfs');
	const imageOutputDir = path.join(rootDir, 'src', 'lib', 'media', 'editions');
	const dataDir = path.join(rootDir, 'src', 'lib', 'data');
	const datasourcePath = path.join(dataDir, 'datasource.ts');

	fs.mkdirSync(pdfSourceDir, { recursive: true });
	fs.mkdirSync(imageOutputDir, { recursive: true });
	fs.mkdirSync(dataDir, { recursive: true });

	return { rootDir, pdfSourceDir, imageOutputDir, datasourcePath };
}

function writeDatasource(datasourcePath, editions) {
	const content = `import type { Edition } from '$lib/types';\n\nexport let editions: Edition[] = ${JSON.stringify(editions, null, 2)};\n`;
	fs.writeFileSync(datasourcePath, content);
}

function readDatasourceEditions(datasourcePath) {
	const content = fs.readFileSync(datasourcePath, 'utf8');
	const marker = 'export let editions: Edition[] = ';
	const index = content.indexOf(marker);
	return vm.runInNewContext(`(${content.slice(index + marker.length).trim().replace(/;$/, '')})`);
}

function createFakePdf(pdfSourceDir, filename, content) {
	const pdfPath = path.join(pdfSourceDir, filename);
	fs.mkdirSync(path.dirname(pdfPath), { recursive: true });
	fs.writeFileSync(pdfPath, content);
	return pdfPath;
}

function createEdition(overrides = {}) {
	return {
		id: '2025',
		name: 'Example',
		subtitle: 'Example subtitle',
		isbn: '',
		description: '',
		publishingDate: '2025',
		coPublisher: '',
		coPublisherUrl: '',
		editors: [],
		designers: [],
		contributors: [],
		keywords: [],
		parentProject: '',
		parentUrl: '',
		pdfId: 'pdf-1',
		pdfStatus: PDF_STATUS_ACTIVE,
		downloadHref: 'pdfs/Example.pdf',
		pdfRelativePath: 'Example.pdf',
		pdfChecksum: 'old-checksum',
		...overrides
	};
}

function fakeGeneratePages(pdfPath, slug, imageOutputDir) {
	const editionDir = path.join(imageOutputDir, slug);
	const pagesDir = path.join(editionDir, 'pages');
	const canvasElementsDir = path.join(editionDir, 'canvasElements');
	const imagesDir = path.join(editionDir, 'images');

	fs.mkdirSync(pagesDir, { recursive: true });
	fs.mkdirSync(canvasElementsDir, { recursive: true });
	fs.mkdirSync(imagesDir, { recursive: true });

	const marker = fs.readFileSync(pdfPath, 'utf8');
	fs.writeFileSync(path.join(pagesDir, 'page-001.jpg'), marker);
	fs.writeFileSync(path.join(canvasElementsDir, 'cover.jpg'), slug);
}

function getPdfMetadataFn(metadataByFile = {}) {
	return (pdfPath) => metadataByFile[path.basename(pdfPath)] || {};
}

test('new upload creates active metadata, identity fields, and assets', () => {
	const { pdfSourceDir, imageOutputDir, datasourcePath } = createTempWorkspace();
	createFakePdf(pdfSourceDir, 'Fresh Upload.pdf', 'fresh-content');
	writeDatasource(datasourcePath, []);

	syncPdfLibrary({
		pdfSourceDir,
		imageOutputDir,
		datasourcePath,
		getPdfMetadataFn: getPdfMetadataFn({
			'Fresh Upload.pdf': {
				Title: 'Fresh Upload Title',
				CreationDate: 'D:202512',
				Author: 'Ada Lovelace'
			}
		}),
		generatePagesFn: fakeGeneratePages,
		idGenerator: () => 'generated-id-1'
	});

	const [edition] = readDatasourceEditions(datasourcePath);
	assert.equal(edition.name, 'Fresh Upload');
	assert.equal(edition.subtitle, 'Fresh Upload Title');
	assert.equal(edition.pdfId, 'generated-id-1');
	assert.equal(edition.pdfStatus, PDF_STATUS_ACTIVE);
	assert.equal(edition.pdfRelativePath, 'Fresh Upload.pdf');
	assert.equal(edition.downloadHref, 'pdfs/Fresh Upload.pdf');
	assert.ok(edition.pdfChecksum);
	assert.equal(fs.readFileSync(path.join(imageOutputDir, 'fresh-upload', 'pages', 'page-001.jpg'), 'utf8'), 'fresh-content');
});

test('editing edition.name renames the pdf and moves the asset folder without changing pdfId', () => {
	const { pdfSourceDir, imageOutputDir, datasourcePath } = createTempWorkspace();
	createFakePdf(pdfSourceDir, 'Old Name.pdf', 'same-content');
	writeDatasource(datasourcePath, [
		createEdition({
			name: 'Renamed Book',
			subtitle: 'Keep metadata',
			pdfId: 'stable-id',
			downloadHref: 'pdfs/Old Name.pdf',
			pdfRelativePath: 'Old Name.pdf'
		})
	]);

	const oldAssetDir = path.join(imageOutputDir, 'old-name');
	fs.mkdirSync(path.join(oldAssetDir, 'images'), { recursive: true });
	fs.writeFileSync(path.join(oldAssetDir, 'images', 'manual.txt'), 'keep-me');

	syncPdfLibrary({
		pdfSourceDir,
		imageOutputDir,
		datasourcePath,
		getPdfMetadataFn: getPdfMetadataFn({
			'Renamed Book.pdf': {
				Title: 'Should not overwrite metadata'
			}
		}),
		generatePagesFn: fakeGeneratePages
	});

	const [edition] = readDatasourceEditions(datasourcePath);
	assert.equal(edition.pdfId, 'stable-id');
	assert.equal(edition.name, 'Renamed Book');
	assert.equal(edition.subtitle, 'Keep metadata');
	assert.equal(edition.pdfRelativePath, 'Renamed Book.pdf');
	assert.equal(edition.downloadHref, 'pdfs/Renamed Book.pdf');
	assert.ok(fs.existsSync(path.join(pdfSourceDir, 'Renamed Book.pdf')));
	assert.ok(!fs.existsSync(path.join(pdfSourceDir, 'Old Name.pdf')));
	assert.ok(fs.existsSync(path.join(imageOutputDir, 'renamed-book', 'images', 'manual.txt')));
});

test('replacing a pdf with the same filename refreshes checksum and assets but keeps metadata', () => {
	const { pdfSourceDir, imageOutputDir, datasourcePath } = createTempWorkspace();
	createFakePdf(pdfSourceDir, 'Stable Name.pdf', 'new-binary');
	writeDatasource(datasourcePath, [
		createEdition({
			name: 'Stable Name',
			subtitle: 'Preserve this subtitle',
			pdfId: 'stable-id',
			downloadHref: 'pdfs/Stable Name.pdf',
			pdfRelativePath: 'Stable Name.pdf',
			pdfChecksum: 'stale-checksum'
		})
	]);

	fs.mkdirSync(path.join(imageOutputDir, 'stable-name', 'pages'), { recursive: true });
	fs.writeFileSync(path.join(imageOutputDir, 'stable-name', 'pages', 'page-001.jpg'), 'old-page');

	syncPdfLibrary({
		pdfSourceDir,
		imageOutputDir,
		datasourcePath,
		getPdfMetadataFn: getPdfMetadataFn({
			'Stable Name.pdf': {
				Title: 'Do not import me'
			}
		}),
		generatePagesFn: fakeGeneratePages
	});

	const [edition] = readDatasourceEditions(datasourcePath);
	assert.equal(edition.subtitle, 'Preserve this subtitle');
	assert.notEqual(edition.pdfChecksum, 'stale-checksum');
	assert.equal(fs.readFileSync(path.join(imageOutputDir, 'stable-name', 'pages', 'page-001.jpg'), 'utf8'), 'new-binary');
});

test('deleting a linked pdf archives the metadata and removes generated assets', () => {
	const { pdfSourceDir, imageOutputDir, datasourcePath } = createTempWorkspace();
	writeDatasource(datasourcePath, [
		createEdition({
			name: 'Deleted Edition',
			pdfId: 'stable-id',
			downloadHref: 'pdfs/Deleted Edition.pdf',
			pdfRelativePath: 'Deleted Edition.pdf'
		})
	]);

	fs.mkdirSync(path.join(imageOutputDir, 'deleted-edition', 'images'), { recursive: true });
	fs.writeFileSync(path.join(imageOutputDir, 'deleted-edition', 'images', 'old.txt'), 'stale');

	syncPdfLibrary({
		pdfSourceDir,
		imageOutputDir,
		datasourcePath,
		getPdfMetadataFn: getPdfMetadataFn(),
		generatePagesFn: fakeGeneratePages
	});

	const [edition] = readDatasourceEditions(datasourcePath);
	assert.equal(edition.pdfStatus, PDF_STATUS_ARCHIVED);
	assert.equal(edition.pdfId, 'stable-id');
	assert.ok(!('downloadHref' in edition));
	assert.ok(!('pdfRelativePath' in edition));
	assert.ok(!('pdfChecksum' in edition));
	assert.ok(!fs.existsSync(path.join(imageOutputDir, 'deleted-edition')));
});

test('re-uploading a deleted pdf reactivates the archived entry with the same pdfId', () => {
	const { pdfSourceDir, imageOutputDir, datasourcePath } = createTempWorkspace();
	createFakePdf(pdfSourceDir, 'Returning Edition.pdf', 'restored');
	writeDatasource(datasourcePath, [
		createEdition({
			name: 'Returning Edition',
			subtitle: 'Keep archived metadata',
			pdfId: 'archived-id',
			pdfStatus: PDF_STATUS_ARCHIVED,
			downloadHref: undefined,
			pdfRelativePath: undefined,
			pdfChecksum: undefined
		})
	]);

	syncPdfLibrary({
		pdfSourceDir,
		imageOutputDir,
		datasourcePath,
		getPdfMetadataFn: getPdfMetadataFn({
			'Returning Edition.pdf': {
				Title: 'Do not replace subtitle'
			}
		}),
		generatePagesFn: fakeGeneratePages
	});

	const [edition] = readDatasourceEditions(datasourcePath);
	assert.equal(edition.pdfId, 'archived-id');
	assert.equal(edition.pdfStatus, PDF_STATUS_ACTIVE);
	assert.equal(edition.subtitle, 'Keep archived metadata');
	assert.equal(edition.pdfRelativePath, 'Returning Edition.pdf');
	assert.equal(edition.downloadHref, 'pdfs/Returning Edition.pdf');
});

test('duplicate active names fail the sync', () => {
	const { pdfSourceDir, imageOutputDir, datasourcePath } = createTempWorkspace();
	writeDatasource(datasourcePath, [
		createEdition({ name: 'Duplicate Name', pdfId: 'id-1' }),
		createEdition({ name: 'Duplicate Name', pdfId: 'id-2', subtitle: 'second' })
	]);

	assert.throws(
		() =>
			syncPdfLibrary({
				pdfSourceDir,
				imageOutputDir,
				datasourcePath,
				getPdfMetadataFn: getPdfMetadataFn(),
				generatePagesFn: fakeGeneratePages
			}),
		/duplicate active edition name/i
	);
});

test('duplicate active pdfIds fail the sync', () => {
	const { pdfSourceDir, imageOutputDir, datasourcePath } = createTempWorkspace();
	writeDatasource(datasourcePath, [
		createEdition({ name: 'First Name', pdfId: 'same-id' }),
		createEdition({ name: 'Second Name', pdfId: 'same-id', subtitle: 'second' })
	]);

	assert.throws(
		() =>
			syncPdfLibrary({
				pdfSourceDir,
				imageOutputDir,
				datasourcePath,
				getPdfMetadataFn: getPdfMetadataFn(),
				generatePagesFn: fakeGeneratePages
			}),
		/duplicate active pdfId/i
	);
});
