import asyncHandler from 'express-async-handler';
import CatalogProduct from '../models/CatalogProduct.js';
import { uploadToCloudinary } from '../middleware/uploadMiddleware.js';

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
  /\/video\/upload\/|\.(mp4|webm|mov|m4v)(\?|$)/i.test(String(url || ''));

const isVideoFile = (file) => Boolean(file?.mimetype?.startsWith('video/'));

const ensureCloudinaryConfigured = (res) => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    res.status(503);
    throw new Error('Cloudinary is not configured on the server (CLOUDINARY_* env vars)');
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
    ensureCloudinaryConfigured(res);
    const stamp = Date.now();
    uploadedAssets = await Promise.all(
      files.map((file, index) => {
        const isVideo = isVideoFile(file);
        const publicId = isVideo
          ? `productv${catalogId}_${stamp}_${index + 1}`
          : `galleryp${catalogId}_${stamp}_${index + 1}`;
        return uploadToCloudinary(file, {
          public_id: publicId,
          resource_type: isVideo ? 'video' : 'image',
        });
      }),
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
    const keptImages = parseGalleryKeepList(req.body.keepGalleryImages).filter((url) => !isVideoUrl(url));
    const keptVideos = parseGalleryKeepList(req.body.keepVideos);
    const keptImageSet = new Set([
      ...(imageCover && !isVideoUrl(imageCover) ? [imageCover] : []),
      ...keptImages,
    ]);
    const keptVideoSet = new Set(keptVideos);

    const priorAdditional = existing?.additionalGalleryImages || [];
    let additionalGalleryImages = [...priorAdditional, ...newImageUrls];
    additionalGalleryImages = [...new Set(additionalGalleryImages)].filter(
      (url) => !isVideoUrl(url) && (keptImageSet.has(url) || newImageUrls.includes(url)),
    );
    payload.additionalGalleryImages = additionalGalleryImages;

    const priorVideos = existing?.additionalVideos || [];
    let additionalVideos = [...priorVideos, ...newVideoUrls];
    additionalVideos = [...new Set(additionalVideos)].filter(
      (url) => keptVideoSet.has(url) || newVideoUrls.includes(url),
    );
    payload.additionalVideos = additionalVideos;
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
  const mergedAssets = [
    ...(existing?.cloudinaryAssets || []),
    ...uploadedAssets.map(({ public_id, url }) => ({ public_id, url })),
  ];

  const product = await CatalogProduct.findOneAndUpdate(
    { catalogId },
    {
      $set: {
        ...Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined)),
        ...(mergedAssets.length ? { cloudinaryAssets: mergedAssets } : {}),
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