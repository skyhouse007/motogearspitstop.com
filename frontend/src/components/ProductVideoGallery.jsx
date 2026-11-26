import React, { useRef } from 'react';
import { Play } from 'lucide-react';
import { motion } from 'framer-motion';
import { useVideoStore } from '@/store/videoStore';

const ProductReelCard = ({ url, index, productName, poster }) => {
  const { openModal } = useVideoStore();
  const videoRef = useRef(null);

  const openReel = () => {
    openModal({
      title: productName,
      videoUrl: url,
      thumbnail: poster,
      source: 'product',
    });
  };

  const handleHoverStart = () => {
    videoRef.current?.play().catch(() => {});
  };

  const handleHoverEnd = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <motion.button
      type="button"
      onClick={openReel}
      onMouseEnter={handleHoverStart}
      onMouseLeave={handleHoverEnd}
      whileHover={{ y: -4, scale: 1.02 }}
      className="group relative mx-auto h-[min(82vh,720px)] w-[min(94vw,400px)] overflow-hidden rounded-2xl border-2 border-gray-200 bg-black text-left shadow-lg transition-colors hover:border-[#e63946] sm:w-[440px] md:w-[500px] lg:w-[560px]"
      aria-label={`${productName} reel ${index + 1}`}
    >
      <video
        ref={videoRef}
        src={url}
        poster={poster}
        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        muted
        loop
        playsInline
        preload="metadata"
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent opacity-90 transition-opacity group-hover:opacity-70" />

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/85 shadow-lg backdrop-blur-md transition-all group-hover:scale-110 group-hover:bg-[#e63946]">
          <Play className="ml-1 h-6 w-6 text-gray-900 group-hover:text-white" fill="currentColor" />
        </div>
      </div>

    </motion.button>
  );
};

export default function ProductVideoGallery({ videos = [], productName = 'Product', poster = '' }) {
  if (!videos.length) return null;

  return (
    <div className="mt-5 space-y-3">
      <div className="flex items-end justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900">Product reels</p>
        <p className="text-xs text-gray-500">{videos.length} video{videos.length > 1 ? 's' : ''}</p>
      </div>

      <div className="flex w-full flex-wrap items-center justify-center gap-4 pb-2 pt-1">
        {videos.map((url, index) => (
          <ProductReelCard
            key={`${url}-${index}`}
            url={url}
            index={index}
            productName={productName}
            poster={poster}
          />
        ))}
      </div>
    </div>
  );
}