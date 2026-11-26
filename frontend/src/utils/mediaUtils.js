const VIDEO_URL_PATTERN =
  /\/video\/upload\/|ik\.imagekit\.io\/.*\.(mp4|webm|mov|m4v)(\?|\/|$)|\.(mp4|webm|mov|m4v)(\?|$)/i;

export const isVideoUrl = (url = '') => {
  const value = String(url).trim();
  if (!value) return false;
  if (value.startsWith('blob:')) return false;
  return VIDEO_URL_PATTERN.test(value);
};

export const isVideoFile = (file) => {
  if (!file) return false;
  if (file.type?.startsWith('video/')) return true;
  return /\.(mp4|webm|mov|m4v)$/i.test(file.name || '');
};

export const getProductVideos = (product = {}) => {
  const fromField = [
    ...(Array.isArray(product.productVideos) ? product.productVideos : []),
    ...(Array.isArray(product.videos) ? product.videos : []),
    ...(Array.isArray(product.additionalVideos) ? product.additionalVideos : []),
  ];

  const fromGallery = [
    product.image,
    ...(Array.isArray(product.galleryImages) ? product.galleryImages : []),
  ].filter(isVideoUrl);

  return [...new Set([...fromField, ...fromGallery].filter(Boolean))];
};