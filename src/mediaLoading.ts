type LoadableMedia = HTMLImageElement | HTMLVideoElement;

const wiredMedia = new WeakSet<LoadableMedia>();

function isLoadableMedia(value: unknown): value is LoadableMedia {
  return value instanceof HTMLImageElement || value instanceof HTMLVideoElement;
}

function isReady(media: LoadableMedia): boolean {
  if (media instanceof HTMLImageElement) {
    return media.complete && media.naturalWidth > 0;
  }
  return media.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
}

function syncLoadingState(media: LoadableMedia): void {
  media.classList.toggle('media-loaded', isReady(media));
}

function wireMedia(media: LoadableMedia): void {
  if (!wiredMedia.has(media)) {
    wiredMedia.add(media);
    const readyEvent = media instanceof HTMLImageElement ? 'load' : 'loadeddata';
    media.addEventListener(readyEvent, () => syncLoadingState(media));
  }
  syncLoadingState(media);
}

function wireMediaWithin(node: Node): void {
  if (!(node instanceof Element)) return;
  if (isLoadableMedia(node)) wireMedia(node);
  node.querySelectorAll('img, video').forEach((media) => {
    if (isLoadableMedia(media)) wireMedia(media);
  });
}

/**
 * Keeps a common placeholder behind every image and video until enough data
 * is available to paint it. Pages are mounted dynamically, so newly inserted
 * media is registered through one document-level observer.
 */
export function initMediaLoading(): void {
  document.querySelectorAll('img, video').forEach((media) => {
    if (isLoadableMedia(media)) wireMedia(media);
  });

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'attributes' && isLoadableMedia(record.target)) {
        syncLoadingState(record.target);
        continue;
      }
      record.addedNodes.forEach(wireMediaWithin);
    }
  });

  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['src', 'srcset'],
  });
}
