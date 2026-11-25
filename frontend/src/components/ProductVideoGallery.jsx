import React from 'react';

export default function ProductVideoGallery({ videos = [], productName = 'Product' }) {
  if (!videos.length) return null;

  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm font-semibold text-gray-700">Product videos</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {videos.map((url, index) => (
          <div
            key={`${url}-${index}`}
            className="overflow-hidden rounded-lg border border-gray-200 bg-black shadow-sm"
          >
            <video
              src={url}
              controls
              playsInline
              preload="metadata"
              className="aspect-video w-full object-contain"
              aria-label={`${productName} video ${index + 1}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}