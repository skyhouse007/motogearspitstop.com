import asyncHandler from 'express-async-handler';
import CatalogProduct from '../models/CatalogProduct.js';
import { isImageKitConfigured, uploadToImageKit } from '../services/imagekitUpload.js';

const parseGalleryKeepList = (raw) => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
};

const isVideoUrl = (url) =>
  /\/video\/upload\/|ik\.imagekit\.io\/.*\.(mp4|webm|mov|m4v)(\?|\/|$)|\.(mp4|webm|mov|m4v)(\?|$)/i.test(
    String(url || ''),
  );

const isVideoFile = (file) => Boolean(file?.mimetype?.startsWith('video/'));

const ensureImageKitConfigured = (res) => {
  if (!isImageKitConfigured()) {
    res.status(503);
    throw new Error(
      'ImageKit keys are missing or incomplete in backend/.env. Copy the full Public key, Private key (long string), and URL endpoint from ImageKit → Developer options, then restart the server.',
    );
  }
};

// @GET /api/catalog/overrides
export const getCatalogOverrides = asyncHandler(async (req, res) => {
  const docs = await CatalogProduct.find().lean();
  const overrides = {};
  for (const doc of docs) {
    overrides[doc.catalogId] = doc;
  }
  res.json({ success: true, overrides });
});

// @GET /api/admin/catalog-products/:catalogId
export const getCatalogProductAdmin = asyncHandler(async (req, res) => {
  const catalogId = String(req.params.catalogId);
  const product = await CatalogProduct.findOne({ catalogId }).lean();
  res.json({ success: true, product: product || null, catalogId });
});

// @PUT /api/admin/catalog-products/:catalogId
export const upsertCatalogProduct = asyncHandler(async (req, res) => {
  const catalogId = String(req.params.catalogId);
  const files = req.files || [];

  const existing = await CatalogProduct.findOne({ catalogId });

  let uploadedAssets = [];
  if (files.length > 0) {
    ensureImageKitConfigured(res);
    const stamp = Date.now();
    uploadedAssets = await Promise.all(
      files.map((file, index) =>
        uploadToImageKit(file, {
          catalogId,
          index,
          stamp,
          isVideo: isVideoFile(file),
        }),
      ),
    );
  }

  const newImageUrls = uploadedAssets
    .filter((asset) => asset.resource_type !== 'video')
    .map((asset) => asset.url);
  const newVideoUrls = uploadedAssets
    .filter((asset) => asset.resource_type === 'video')
    .map((asset) => asset.url);
  const hasGalleryPayload =
    req.body.keepGalleryImages !== undefined ||
    req.body.keepVideos !== undefined ||
    files.length > 0;

  const payload = {
    catalogId,
    name: req.body.name?.trim() || undefined,
    description: req.body.description ?? undefined,
    price: req.body.price !== undefined && req.body.price !== '' ? Number(req.body.price) : undefined,
    discount: req.body.discount !== undefined && req.body.discount !== '' ? Number(req.body.discount) : undefined,
    category: req.body.category?.trim() || undefined,
    subcategory: req.body.subcategory?.trim() || undefined,
    brand: req.body.brand?.trim() || undefined,
    stock: req.body.stock !== undefined && req.body.stock !== '' ? Number(req.body.stock) : undefined,
  };

  const imageCover = req.body.image?.trim();
  if (imageCover && !isVideoUrl(imageCover)) {
    payload.image = imageCover;
  }

  if (hasGalleryPayload) {
    // Admin sent an explicit keep list — treat it as the managed media set so
    // deletes/reorders stick and static products.js URLs are not re-merged.
    const keptImages = parseGalleryKeepList(req.body.keepGalleryImages).filter((url) => !isVideoUrl(url));
    const keptVideos = parseGalleryKeepList(req.body.keepVideos).filter(Boolean);

    const orderedImages = [];
    const seenImages = new Set();
    const pushImage = (url) => {
      if (!url || isVideoUrl(url) || seenImages.has(url)) return;
      seenImages.add(url);
      orderedImages.push(url);
    };

    if (imageCover && keptImages.includes(imageCover)) {
      pushImage(imageCover);
    }
    keptImages.forEach(pushImage);
    newImageUrls.forEach(pushImage);

    const primary = orderedImages[0] || '';
    payload.image = primary;
    payload.galleryImages = orderedImages.filter((url) => url !== primary);
    // Authoritative ordered list — merge uses this and ignores products.js images.
    payload.managedImages = orderedImages;
    // Clear legacy additive list so deleted URLs cannot come back on merge.
    payload.additionalGalleryImages = [];
    payload.mediaManaged = true;

    const orderedVideos = [];
    const seenVideos = new Set();
    const pushVideo = (url) => {
      if (!url || seenVideos.has(url)) return;
      seenVideos.add(url);
      orderedVideos.push(url);
    };
    keptVideos.forEach(pushVideo);
    newVideoUrls.forEach(pushVideo);
    payload.additionalVideos = orderedVideos;
  } else {
    if (newImageUrls.length > 0) {
      payload.additionalGalleryImages = [
        ...new Set([...(existing?.additionalGalleryImages || []), ...newImageUrls]),
      ];
    }
    if (newVideoUrls.length > 0) {
      payload.additionalVideos = [...new Set([...(existing?.additionalVideos || []), ...newVideoUrls])];
    }
  }

  const mergedImageKitAssets = [
    ...(existing?.imagekitAssets || []),
    ...uploadedAssets.map(({ fileId, url, filePath }) => ({ fileId, url, filePath })),
  ];

  const product = await CatalogProduct.findOneAndUpdate(
    { catalogId },
    {
      $set: {
        ...Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined)),
        ...(mergedImageKitAssets.length ? { imagekitAssets: mergedImageKitAssets } : {}),
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  res.json({ success: true, product });
});

// @PATCH /api/admin/catalog-products/:catalogId/stock
export const patchCatalogProductStock = asyncHandler(async (req, res) => {
  const catalogId = String(req.params.catalogId);
  const stock = Math.max(Number(req.body.stock) || 0, 0);

  const product = await CatalogProduct.findOneAndUpdate(
    { catalogId },
    { $set: { catalogId, stock } },
    { new: true, upsert: true },
  );

  res.json({ success: true, product });
});