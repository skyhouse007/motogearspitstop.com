import mongoose from 'mongoose';

const cloudinaryAssetSchema = new mongoose.Schema(
  {
    public_id: String,
    url: String,
  },
  { _id: false },
);

const imagekitAssetSchema = new mongoose.Schema(
  {
    fileId: String,
    url: String,
    filePath: String,
  },
  { _id: false },
);

const catalogProductSchema = new mongoose.Schema(
  {
    catalogId: { type: String, required: true, unique: true, index: true },
    name: String,
    description: String,
    price: Number,
    discount: Number,
    category: String,
    subcategory: String,
    brand: String,
    stock: Number,
    image: String,
    galleryImages: [String],
    /**
     * When true, managedImages (or image + galleryImages) + additionalVideos are the
     * source of truth and static catalog media from products.js is not re-merged.
     */
    mediaManaged: { type: Boolean, default: false },
    /** Full ordered photo list when mediaManaged (cover first). */
    managedImages: [String],
    /** New admin uploads only — merged on top of products.js images on the storefront */
    additionalGalleryImages: [String],
    additionalVideos: [String],
    /** Legacy admin uploads on Cloudinary — left as-is */
    cloudinaryAssets: [cloudinaryAssetSchema],
    /** New admin uploads on ImageKit (motogear folder) */
    imagekitAssets: [imagekitAssetSchema],
  },
  { timestamps: true },
);

const CatalogProduct = mongoose.model('CatalogProduct', catalogProductSchema);
export default CatalogProduct;