import type { DragDropState } from '@thisux/sveltednd';
import type { Edition } from '$lib/types';

export function isEdition(value: unknown): value is Edition {
	if (!value || typeof value !== 'object') return false;
	const candidate = value as Partial<Edition>;
	return typeof candidate.id === 'string' && typeof candidate.name === 'string';
}

type FooterDropCallbacks = {
	onDropEdition: (edition: Edition) => void;
	onDragEnter: () => void;
	onDragLeave: () => void;
};

export function createFooterDropMechanism(callbacks: FooterDropCallbacks) {
	function handleDrop(state: DragDropState<Edition>) {
		const { draggedItem } = state;
		if (!isEdition(draggedItem)) return;
		callbacks.onDropEdition(draggedItem);
	}

	function handleDragEnter() {
		callbacks.onDragEnter();
	}

	function handleDragLeave() {
		callbacks.onDragLeave();
	}

	return { handleDrop, handleDragEnter, handleDragLeave };
}

type CanvasDragCallbacks = {
	onFooterOpenChange: (isOpen: boolean) => void;
	onCoverDraggingChange: (isDragging: boolean) => void;
};

export function createCanvasDragMechanism(callbacks: CanvasDragCallbacks) {
	let isDraggingCover = false;
	let isNativeDragInProgress = false;
	let dragGhostElement: HTMLElement | null = null;

	function cleanupDragGhost() {
		if (!dragGhostElement) return;
		dragGhostElement.remove();
		dragGhostElement = null;
	}

	function beginCoverDrag() {
		if (isDraggingCover) return;
		isDraggingCover = true;
		callbacks.onCoverDraggingChange(true);
		callbacks.onFooterOpenChange(true);
	}

	function finishCoverDrag() {
		isNativeDragInProgress = false;
		if (!isDraggingCover) {
			callbacks.onCoverDraggingChange(false);
			cleanupDragGhost();
			return;
		}

		isDraggingCover = false;
		callbacks.onCoverDraggingChange(false);
		callbacks.onFooterOpenChange(false);
		cleanupDragGhost();
	}

	function maybeEndPointerDrag() {
		if (isNativeDragInProgress) return;
		finishCoverDrag();
	}

	function setDragImage(event: DragEvent) {
		if (!event.dataTransfer) return;
		const target = event.currentTarget as HTMLElement | null;
		if (!target) return;

		cleanupDragGhost();
		const rect = target.getBoundingClientRect();
		const img = target.querySelector('img');
		const dragElement = img
			? (img.cloneNode(true) as HTMLElement)
			: (target.cloneNode(true) as HTMLElement);

		dragElement.style.width = `${rect.width}px`;
		dragElement.style.height = `${rect.height}px`;
		dragElement.style.opacity = '1';
		dragElement.style.position = 'fixed';
		dragElement.style.top = '-9999px';
		dragElement.style.left = '-9999px';
		dragElement.style.zIndex = '1000';
		dragElement.style.pointerEvents = 'none';

		document.body.appendChild(dragElement);
		dragGhostElement = dragElement;

		const offsetX = event.clientX - rect.left;
		const offsetY = event.clientY - rect.top;

		try {
			event.dataTransfer.setDragImage(dragElement, offsetX, offsetY);
		} catch (error) {
			console.error('Failed to set drag image:', error);
			cleanupDragGhost();
		}
	}

	function handleDraggableStart(_state: DragDropState<Edition>) {
		beginCoverDrag();
	}

	function handleDraggableEnd(_state: DragDropState<Edition>) {
		finishCoverDrag();
	}

	function handleNativeDragStart(event: DragEvent) {
		isNativeDragInProgress = true;
		beginCoverDrag();
		setDragImage(event);
	}

	function handleNativeDragEnd() {
		finishCoverDrag();
	}

	return {
		beginCoverDrag,
		finishCoverDrag,
		maybeEndPointerDrag,
		handleDraggableStart,
		handleDraggableEnd,
		handleNativeDragStart,
		handleNativeDragEnd,
		cleanupDragGhost
	};
}
