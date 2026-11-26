import React, { useEffect, useState } from 'react';
import { Loader2, Play, Upload, X } from 'lucide-react';
import api from '@/api/axiosInstance';
import useCatalogOverrideStore from '@/store/catalogOverrideStore';
import { getProductImageCandidates } from '@/utils/imageUtils';
import { mergeCatalogProduct } from '@/utils/mergeCatalogProduct';
import { getProductVideos, isVideoFile, isVideoUrl } from '@/utils/mediaUtils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';

const fieldClass =
  'w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-red-500';

export default function AdminProductEditModal({ product, open, onOpenChange, onSaved }) {
  const { toast } = useToast();
  const upsertLocalOverride = useCatalogOverrideStore((s) => s.upsertLocalOverride);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({});
  const [keptImages, setKeptImages] = useState([]);
  const [keptVideos, setKeptVideos] = useState([]);
  const [primaryImage, setPrimaryImage] = useState('');
  const [newFiles, setNewFiles] = useState([]);
  const [previewItems, setPreviewItems] = useState([]);

  const catalogId = product?.id;

  const resetFromProduct = (p) => {
    setForm({
      name: p?.name || '',
      description: p?.description || '',
      price: p?.price ?? '',
      discount: p?.discount ?? 0,
      category: p?.category || '',
      subcategory: p?.subcategory || '',
      brand: p?.brand || '',
      stock: p?.stock ?? '',
    });
    const images = getProductImageCandidates(p);
    const videos = getProductVideos(p);
    setKeptImages(images);
    setKeptVideos(videos);
    setPrimaryImage(images.find((url) => !isVideoUrl(url)) || images[0] || '');
    setNewFiles([]);
    setPreviewItems([]);
  };

  useEffect(() => {
    if (!open || !catalogId) return;
    resetFromProduct(product);
    setLoading(true);
    api
      .get(`/admin/catalog-products/${catalogId}`)
      .then((res) => {
        const saved = res.data?.product;
        if (saved) {
          const merged = {
            ...product,
            ...saved,
            additionalGalleryImages: saved.additionalGalleryImages || [],
          };
          resetFromProduct(mergeCatalogProduct(product, saved) || merged);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, catalogId, product]);

  useEffect(() => {
    const items = newFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      isVideo: isVideoFile(file),
    }));
    setPreviewItems(items);
    return () => items.forEach((item) => URL.revokeObjectURL(item.url));
  }, [newFiles]);

  const hasAnyMedia = keptImages.length + keptVideos.length + previewItems.length > 0;

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleKeepImage = (url) => {
    setKeptImages((prev) => {
      const next = prev.includes(url) ? prev.filter((item) => item !== url) : [...prev, url];
      if (primaryImage === url && !next.includes(url)) {
        setPrimaryImage(next.find((item) => !isVideoUrl(item)) || '');
      }
      return next;
    });
  };

  const toggleKeepVideo = (url) => {
    setKeptVideos((prev) => (
      prev.includes(url) ? prev.filter((item) => item !== url) : [...prev, url]
    ));
  };

  const selectPrimary = (url) => {
    if (isVideoUrl(url)) return;
    setPrimaryImage(url);
  };

  const handleSave = async () => {
    if (!catalogId) return;
    setSaving(true);
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        body.append(key, value === null || value === undefined ? '' : String(value));
      });
      const existingPrimary =
        primaryImage && keptImages.includes(primaryImage) ? primaryImage : keptImages[0] || '';
      body.append('keepGalleryImages', JSON.stringify(keptImages.filter((url) => url && !isVideoUrl(url))));
      body.append('keepVideos', JSON.stringify(keptVideos.filter(Boolean)));
      if (existingPrimary && !isVideoUrl(existingPrimary)) {
        body.append('image', existingPrimary);
      }
      newFiles.forEach((file) => body.append('images', file));

      const res = await api.put(`/admin/catalog-products/${catalogId}`, body);
      const saved = res.data?.product;
      if (saved) {
        upsertLocalOverride(catalogId, saved);
      }
      toast({ title: 'Product saved', description: 'Changes are live on the storefront.' });
      onSaved?.(saved);
      onOpenChange(false);
    } catch (err) {
      const raw =
        err.response?.data?.message ||
        err.message ||
        'Could not save product.';
      const message = /imagekit/i.test(raw)
        ? raw
        : /unknown api key|invalid api key|cloudinary/i.test(raw)
          ? 'Server media keys are missing. For new uploads set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and IMAGEKIT_URL_ENDPOINT in backend/.env (ImageKit → Developer options), then restart the API.'
          : raw;
      toast({ title: 'Save failed', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-gray-800 bg-gray-900 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Edit product · ID {catalogId}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="mr-2 animate-spin" size={20} />
            Loading saved changes…
          </div>
        ) : (
          <div className="space-y-4">
            <label className="block text-sm text-gray-400">
              Name
              <input
                className={`${fieldClass} mt-1`}
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
              />
            </label>

            <label className="block text-sm text-gray-400">
              Description
              <textarea
                rows={4}
                className={`${fieldClass} mt-1 resize-y`}
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
              />
            </label>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <label className="block text-sm text-gray-400">
                Price (₹)
                <input
                  type="number"
                  min={0}
                  className={`${fieldClass} mt-1`}
                  value={form.price}
                  onChange={(e) => updateField('price', e.target.value)}
                />
              </label>
              <label className="block text-sm text-gray-400">
                Discount %
                <input
                  type="number"
                  min={0}
                  max={100}
                  className={`${fieldClass} mt-1`}
                  value={form.discount}
                  onChange={(e) => updateField('discount', e.target.value)}
                />
              </label>
              <label className="block text-sm text-gray-400">
                Stock
                <input
                  type="number"
                  min={0}
                  className={`${fieldClass} mt-1`}
                  value={form.stock}
                  onChange={(e) => updateField('stock', e.target.value)}
                />
              </label>
              <label className="block text-sm text-gray-400">
                Brand
                <input
                  className={`${fieldClass} mt-1`}
                  value={form.brand}
                  onChange={(e) => updateField('brand', e.target.value)}
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-sm text-gray-400">
                Category
                <input
                  className={`${fieldClass} mt-1`}
                  value={form.category}
                  onChange={(e) => updateField('category', e.target.value)}
                />
              </label>
              <label className="block text-sm text-gray-400">
                Subcategory
                <input
                  className={`${fieldClass} mt-1`}
                  value={form.subcategory}
                  onChange={(e) => updateField('subcategory', e.target.value)}
                />
              </label>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-gray-300">Photos &amp; videos</p>
              <p className="mb-3 text-xs text-gray-500">
                Older catalog URLs stay on Cloudinary/ImageKit as they are. New uploads from today go to ImageKit in the
                <span className="font-medium text-gray-300"> motogear </span>
                folder. Tap a photo for cover; videos are gallery-only.
              </p>
              <div className="flex flex-wrap gap-3">
                {keptImages.map((url) => (
                  <div
                    key={url}
                    className={`relative h-20 w-20 overflow-hidden rounded-lg border-2 ${
                      primaryImage === url ? 'border-red-500' : 'border-gray-700'
                    }`}
                  >
                    <button type="button" className="h-full w-full" onClick={() => selectPrimary(url)}>
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </button>
                    <button
                      type="button"
                      className="absolute right-0 top-0 rounded-bl bg-black/70 p-0.5 text-white"
                      onClick={() => toggleKeepImage(url)}
                      title="Remove on save"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {keptVideos.map((url) => (
                  <div
                    key={url}
                    className="relative h-20 w-28 overflow-hidden rounded-lg border border-gray-700 bg-black"
                  >
                    <video src={url} className="h-full w-full object-cover" muted preload="metadata" />
                    <Play className="pointer-events-none absolute inset-0 m-auto text-white opacity-80" size={22} />
                    <button
                      type="button"
                      className="absolute right-0 top-0 rounded-bl bg-black/70 p-0.5 text-white"
                      onClick={() => toggleKeepVideo(url)}
                      title="Remove video on save"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {previewItems.map((item, index) => (
                  <div
                    key={item.url}
                    className="relative h-20 w-20 overflow-hidden rounded-lg border border-dashed border-gray-600 bg-black"
                  >
                    {item.isVideo ? (
                      <video src={item.url} className="h-full w-full object-cover opacity-90" muted />
                    ) : (
                      <img src={item.url} alt="" className="h-full w-full object-cover opacity-90" />
                    )}
                    <button
                      type="button"
                      className="absolute right-0 top-0 rounded-bl bg-black/70 p-0.5 text-white"
                      onClick={() => setNewFiles((files) => files.filter((_, i) => i !== index))}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 hover:border-red-500">
                <Upload size={16} />
                Upload photos or videos
                <input
                  type="file"
                  accept="image/*,video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length) setNewFiles((prev) => [...prev, ...files]);
                    e.target.value = '';
                  }}
                />
              </label>

              {!hasAnyMedia && (
                <p className="mt-2 text-xs text-amber-400">
                  No media yet — add photos and/or product videos.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-lg bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              >
                {saving && <Loader2 className="animate-spin" size={16} />}
                Save changes
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}