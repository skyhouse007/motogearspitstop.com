import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Play, Upload, X } from 'lucide-react';
import api from '@/api/axiosInstance';
import { products as catalogProducts } from '@/data/products';
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

const moveItem = (list, fromIndex, toIndex) => {
  if (toIndex < 0 || toIndex >= list.length || fromIndex === toIndex) return list;
  const next = [...list];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
};

const getCatalogBase = (catalogId, fallback) => {
  const found = catalogProducts.find((item) => String(item.id) === String(catalogId));
  return found || fallback;
};

export default function AdminProductEditModal({ product, open, onOpenChange, onSaved }) {
  const { toast } = useToast();
  const upsertLocalOverride = useCatalogOverrideStore((s) => s.upsertLocalOverride);
  const loadTokenRef = useRef(0);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({});
  const [keptImages, setKeptImages] = useState([]);
  const [keptVideos, setKeptVideos] = useState([]);
  const [newImageFiles, setNewImageFiles] = useState([]);
  const [newVideoFiles, setNewVideoFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [videoPreviews, setVideoPreviews] = useState([]);

  const catalogId = product?.id;
  const primaryImage = keptImages[0] || '';

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
    const images = getProductImageCandidates(p).filter((url) => !isVideoUrl(url));
    const videos = getProductVideos(p);
    const primary = images.find((url) => url === p?.image) || images[0] || '';
    setKeptImages(primary ? [primary, ...images.filter((url) => url !== primary)] : images);
    setKeptVideos(videos);
    setNewImageFiles([]);
    setNewVideoFiles([]);
  };

  useEffect(() => {
    if (!open || !catalogId) return undefined;

    const token = loadTokenRef.current + 1;
    loadTokenRef.current = token;
    const base = getCatalogBase(catalogId, product);
    resetFromProduct(base);
    setLoading(true);

    api
      .get(`/admin/catalog-products/${catalogId}`)
      .then((res) => {
        if (loadTokenRef.current !== token) return;
        const saved = res.data?.product;
        if (saved) {
          resetFromProduct(mergeCatalogProduct(base, saved));
        } else {
          const local = useCatalogOverrideStore.getState().overrides[String(catalogId)];
          if (local) resetFromProduct(mergeCatalogProduct(base, local));
        }
      })
      .catch(() => {
        if (loadTokenRef.current !== token) return;
        const local = useCatalogOverrideStore.getState().overrides[String(catalogId)];
        if (local) resetFromProduct(mergeCatalogProduct(base, local));
      })
      .finally(() => {
        if (loadTokenRef.current === token) setLoading(false);
      });

    return undefined;
    // Only reload when the modal opens for a product — not on every parent re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, catalogId]);

  useEffect(() => {
    const items = newImageFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setImagePreviews(items);
    return () => items.forEach((item) => URL.revokeObjectURL(item.url));
  }, [newImageFiles]);

  useEffect(() => {
    const items = newVideoFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setVideoPreviews(items);
    return () => items.forEach((item) => URL.revokeObjectURL(item.url));
  }, [newVideoFiles]);

  const hasAnyMedia =
    keptImages.length + keptVideos.length + imagePreviews.length + videoPreviews.length > 0;

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const removeKeptImage = (index, event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    setKeptImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeKeptVideo = (index, event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    setKeptVideos((prev) => prev.filter((_, i) => i !== index));
  };

  const reorderImage = (index, direction, event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    setKeptImages((prev) => moveItem(prev, index, index + direction));
  };

  const makeCover = (url) => {
    setKeptImages((prev) => {
      if (!prev.includes(url) || prev[0] === url) return prev;
      return [url, ...prev.filter((item) => item !== url)];
    });
  };

  const reorderVideo = (index, direction, event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    setKeptVideos((prev) => moveItem(prev, index, index + direction));
  };

  const handleSave = async () => {
    if (!catalogId) return;
    setSaving(true);
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        body.append(key, value === null || value === undefined ? '' : String(value));
      });
      const imagesToKeep = keptImages.filter((url) => url && !isVideoUrl(url));
      const videosToKeep = keptVideos.filter(Boolean);
      body.append('keepGalleryImages', JSON.stringify(imagesToKeep));
      body.append('keepVideos', JSON.stringify(videosToKeep));
      if (imagesToKeep[0]) {
        body.append('image', imagesToKeep[0]);
      }
      newImageFiles.forEach((file) => body.append('images', file));
      newVideoFiles.forEach((file) => body.append('images', file));

      const res = await api.put(`/admin/catalog-products/${catalogId}`, body);
      const saved = res.data?.product || {};
      // Always stamp managed media locally so deletes stick even if response is partial.
      upsertLocalOverride(catalogId, {
        ...saved,
        mediaManaged: true,
        managedImages: Array.isArray(saved.managedImages) && saved.managedImages.length
          ? saved.managedImages
          : imagesToKeep,
        image: saved.image || imagesToKeep[0] || '',
        galleryImages: Array.isArray(saved.galleryImages)
          ? saved.galleryImages
          : imagesToKeep.slice(1),
        additionalGalleryImages: [],
        additionalVideos: Array.isArray(saved.additionalVideos)
          ? saved.additionalVideos
          : videosToKeep,
      });
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
              <p className="mb-2 text-sm font-medium text-gray-300">Photos</p>
              <p className="mb-3 text-xs text-gray-500">
                First photo is the cover. Use arrows to reorder, tap a photo to make it cover, or remove with ×.
                Then click Save — removals persist after save.
              </p>
              <div className="flex flex-wrap gap-3">
                {keptImages.map((url, index) => (
                  <div
                    key={`${url}-${index}`}
                    className={`relative h-20 w-20 overflow-hidden rounded-lg border-2 ${
                      primaryImage === url ? 'border-red-500' : 'border-gray-700'
                    }`}
                  >
                    <button
                      type="button"
                      className="h-full w-full"
                      onClick={() => makeCover(url)}
                      title="Make cover"
                    >
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </button>
                    {primaryImage === url && (
                      <span className="pointer-events-none absolute bottom-5 left-0 right-0 bg-red-600/90 px-1 py-0.5 text-center text-[10px] font-medium text-white">
                        Cover
                      </span>
                    )}
                    <button
                      type="button"
                      className="absolute right-0 top-0 z-20 rounded-bl bg-black/80 p-1 text-white hover:bg-red-600"
                      onClick={(event) => removeKeptImage(index, event)}
                      title="Remove photo"
                    >
                      <X size={14} />
                    </button>
                    {keptImages.length > 1 && (
                      <div className="absolute bottom-0 left-0 right-0 z-10 flex justify-between bg-black/70">
                        <button
                          type="button"
                          className="p-0.5 text-white disabled:opacity-30"
                          disabled={index === 0}
                          onClick={(event) => reorderImage(index, -1, event)}
                          title="Move earlier"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <button
                          type="button"
                          className="p-0.5 text-white disabled:opacity-30"
                          disabled={index === keptImages.length - 1}
                          onClick={(event) => reorderImage(index, 1, event)}
                          title="Move later"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {imagePreviews.map((item, index) => (
                  <div
                    key={item.url}
                    className="relative h-20 w-20 overflow-hidden rounded-lg border border-dashed border-gray-600 bg-black"
                  >
                    <img src={item.url} alt="" className="h-full w-full object-cover opacity-90" />
                    <button
                      type="button"
                      className="absolute right-0 top-0 z-20 rounded-bl bg-black/80 p-1 text-white hover:bg-red-600"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setNewImageFiles((files) => files.filter((_, i) => i !== index));
                      }}
                      title="Remove upload"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 hover:border-red-500">
                <Upload size={16} />
                Upload photos
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []).filter((file) => !isVideoFile(file));
                    if (files.length) setNewImageFiles((prev) => [...prev, ...files]);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-gray-300">Videos</p>
              <p className="mb-3 text-xs text-gray-500">
                Product videos show in their own section on the product page. Reorder with arrows; remove with ×, then Save.
              </p>
              <div className="flex flex-wrap gap-3">
                {keptVideos.map((url, index) => (
                  <div
                    key={`${url}-${index}`}
                    className="relative h-20 w-28 overflow-hidden rounded-lg border border-gray-700 bg-black"
                  >
                    <video src={url} className="h-full w-full object-cover" muted preload="metadata" />
                    <Play className="pointer-events-none absolute inset-0 m-auto text-white opacity-80" size={22} />
                    <button
                      type="button"
                      className="absolute right-0 top-0 z-20 rounded-bl bg-black/80 p-1 text-white hover:bg-red-600"
                      onClick={(event) => removeKeptVideo(index, event)}
                      title="Remove video"
                    >
                      <X size={14} />
                    </button>
                    {keptVideos.length > 1 && (
                      <div className="absolute bottom-0 left-0 right-0 z-10 flex justify-between bg-black/70">
                        <button
                          type="button"
                          className="p-0.5 text-white disabled:opacity-30"
                          disabled={index === 0}
                          onClick={(event) => reorderVideo(index, -1, event)}
                          title="Move earlier"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <button
                          type="button"
                          className="p-0.5 text-white disabled:opacity-30"
                          disabled={index === keptVideos.length - 1}
                          onClick={(event) => reorderVideo(index, 1, event)}
                          title="Move later"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {videoPreviews.map((item, index) => (
                  <div
                    key={item.url}
                    className="relative h-20 w-28 overflow-hidden rounded-lg border border-dashed border-gray-600 bg-black"
                  >
                    <video src={item.url} className="h-full w-full object-cover opacity-90" muted />
                    <Play className="pointer-events-none absolute inset-0 m-auto text-white opacity-80" size={22} />
                    <button
                      type="button"
                      className="absolute right-0 top-0 z-20 rounded-bl bg-black/80 p-1 text-white hover:bg-red-600"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setNewVideoFiles((files) => files.filter((_, i) => i !== index));
                      }}
                      title="Remove upload"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 hover:border-red-500">
                <Upload size={16} />
                Upload videos
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []).filter((file) => isVideoFile(file));
                    if (files.length) setNewVideoFiles((prev) => [...prev, ...files]);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>

            {!hasAnyMedia && (
              <p className="text-xs text-amber-400">
                No media yet — add photos and/or product videos.
              </p>
            )}

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
