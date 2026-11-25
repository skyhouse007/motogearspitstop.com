import mongoose from 'mongoose';

const cloudinaryAssetSchema = new mongoose.Schema(
  {
    public_id: String,
    url: String,
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
    /** New admin uploads only — merged on top of products.js images on the storefront */
    additionalGalleryImages: [String],
    additionalVideos: [String],
    cloudinaryAssets: [cloudinaryAssetSchema],
  },
  { timestamps: true },
);

const CatalogProduct = mongoose.model('CatalogProduct', catalogProductSchema);
export default CatalogProduct;