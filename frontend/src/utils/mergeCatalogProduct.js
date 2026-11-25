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

  const primary = (override.image && !isVideoUrl(override.image) ? override.image : null)
    || base.image
    || orderedUrls[0]
    || '';

  if (primary && !isVideoUrl(primary)) {
    merged.image = primary;
  }

  merged.galleryImages = orderedUrls.filter((url) => url && url !== merged.image);

  const productVideos = [];
  const addVideo = (url) => {
    if (!url || !isVideoUrl(url) || productVideos.includes(url)) return;
    productVideos.push(url);
  };

  getProductVideos(base).forEach(addVideo);
  if (Array.isArray(override.additionalVideos)) {
    override.additionalVideos.forEach(addVideo);
  }

  merged.productVideos = productVideos;

  return merged;
}