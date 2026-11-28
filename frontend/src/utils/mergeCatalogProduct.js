import { getProductImageCandidates } from '@/utils/imageUtils';
import { getProductVideos, isVideoUrl } from '@/utils/mediaUtils';

const MERGE_FIELDS = [
  'name',
  'description',
  'price',
  'discount',
  'category',
  'subcategory',
  'brand',
  'stock',
];

export function mergeCatalogProduct(base, override) {
  if (!base) return base;
  if (!override) return base;

  const merged = { ...base };

  MERGE_FIELDS.forEach((field) => {
    const value = override[field];
    if (value !== undefined && value !== null && value !== '') {
      merged[field] = value;
    }
  });

  const orderedUrls = [];
  const seen = new Set();
  const addUrl = (url) => {
    if (!url || seen.has(url) || isVideoUrl(url)) return;
    seen.add(url);
    orderedUrls.push(url);
  };

  if (override.mediaManaged) {
    // Admin-managed media only — never re-add static catalog or stale additional URLs.
    if (Array.isArray(override.managedImages)) {
      override.managedImages.filter((url) => url && !isVideoUrl(url)).forEach(addUrl);
    } else {
      if (override.image && !isVideoUrl(override.image)) {
        addUrl(override.image);
      }
      if (Array.isArray(override.galleryImages)) {
        override.galleryImages.filter((url) => !isVideoUrl(url)).forEach(addUrl);
      }
    }
  } else {
    getProductImageCandidates(base).forEach(addUrl);

    if (Array.isArray(override.additionalGalleryImages)) {
      override.additionalGalleryImages.forEach(addUrl);
    }

    if (Array.isArray(override.galleryImages)) {
      override.galleryImages.filter((url) => !isVideoUrl(url)).forEach(addUrl);
    }

    if (override.image && !isVideoUrl(override.image)) {
      addUrl(override.image);
    }
  }

  const primary = override.mediaManaged
    ? (orderedUrls[0] || '')
    : (override.image && !isVideoUrl(override.image) ? override.image : null)
      || base.image
      || orderedUrls[0]
      || '';

  if (override.mediaManaged) {
    merged.image = primary || '';
  } else if (primary && !isVideoUrl(primary)) {
    merged.image = primary;
  }

  // Keep gallery order: primary first in candidates, then remaining in managed/base order.
  merged.galleryImages = orderedUrls.filter((url) => url && url !== merged.image);
  if (!merged.image) {
    delete merged.image;
  }

  const productVideos = [];
  const addVideo = (url) => {
    if (!url || !isVideoUrl(url) || productVideos.includes(url)) return;
    productVideos.push(url);
  };

  if (override.mediaManaged) {
    if (Array.isArray(override.additionalVideos)) {
      override.additionalVideos.forEach(addVideo);
    }
  } else {
    getProductVideos(base).forEach(addVideo);
    if (Array.isArray(override.additionalVideos)) {
      override.additionalVideos.forEach(addVideo);
    }
  }

  merged.productVideos = productVideos;

  return merged;
}
