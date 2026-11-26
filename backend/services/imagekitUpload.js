import ImageKit from 'imagekit';
import path from 'path';

let imagekitClient = null;

const trimEnv = (value) => String(value || '').trim().replace(/^['"]|['"]$/g, '');

const getImageKitClient = () => {
  if (imagekitClient) return imagekitClient;

  const publicKey = trimEnv(process.env.IMAGEKIT_PUBLIC_KEY);
  const privateKey = trimEnv(process.env.IMAGEKIT_PRIVATE_KEY);
  const urlEndpoint = trimEnv(process.env.IMAGEKIT_URL_ENDPOINT);

  if (!publicKey || !privateKey || !urlEndpoint) {
    return null;
  }

  imagekitClient = new ImageKit({
    publicKey,
    privateKey,
    urlEndpoint,
  });

  return imagekitClient;
};

const IMAGEKIT_PLACEHOLDERS = new Set([
  'your_imagekit_public_key',
  'your_imagekit_private_key',
  'your_imagekit_url_endpoint',
  'https://ik.imagekit.io/your_imagekit_id',
]);

export const isImageKitConfigured = () => {
  const publicKey = trimEnv(process.env.IMAGEKIT_PUBLIC_KEY);
  const privateKey = trimEnv(process.env.IMAGEKIT_PRIVATE_KEY);
  const urlEndpoint = trimEnv(process.env.IMAGEKIT_URL_ENDPOINT);

  if (!publicKey || !privateKey || !urlEndpoint) return false;
  if (IMAGEKIT_PLACEHOLDERS.has(publicKey) || IMAGEKIT_PLACEHOLDERS.has(privateKey) || IMAGEKIT_PLACEHOLDERS.has(urlEndpoint)) {
    return false;
  }
  if (/^your_/i.test(publicKey) || /^your_/i.test(privateKey)) return false;
  if (!publicKey.startsWith('public_')) return false;
  if (!privateKey.startsWith('private_') || privateKey.length < 24) return false;
  if (!urlEndpoint.startsWith('https://ik.imagekit.io/')) return false;
  return true;
};

const formatImageKitAuthHelp = () =>
  'ImageKit authentication failed. In backend/.env set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY (full long key from Developer options), and IMAGEKIT_URL_ENDPOINT from the same ImageKit account. If the public key contains +, wrap it in double quotes. Restart the backend.';

const guessExtension = (file, isVideo) => {
  const fromName = path.extname(file.originalname || '');
  if (fromName) return fromName;
  if (isVideo) return '.mp4';
  const mime = file.mimetype || '';
  if (mime.includes('png')) return '.png';
  if (mime.includes('webp')) return '.webp';
  if (mime.includes('gif')) return '.gif';
  return '.jpg';
};

export const uploadToImageKit = async (file, { catalogId, index, stamp, isVideo }) => {
  const client = getImageKitClient();
  if (!client) {
    const err = new Error('ImageKit is not configured on the server');
    err.statusCode = 503;
    throw err;
  }

  const rootFolder = (process.env.IMAGEKIT_UPLOAD_FOLDER || 'motogear').replace(/^\/+|\/+$/g, '');
  const folder = `/${rootFolder}/${catalogId}`;
  const ext = guessExtension(file, isVideo);
  const prefix = isVideo ? 'productv' : 'galleryp';
  const fileName = `${prefix}${catalogId}_${stamp}_${index + 1}${ext}`;

  let response;
  try {
    response = await client.upload({
      file: file.buffer,
      fileName,
      folder,
      useUniqueFileName: true,
      isPublished: true,
    });
  } catch (error) {
    const raw = error?.message || error?.help || String(error);
    if (/cannot be authenticated|unauthorized|401|403/i.test(raw)) {
      throw new Error(formatImageKitAuthHelp());
    }
    throw error;
  }

  return {
    url: response.url,
    fileId: response.fileId,
    filePath: response.filePath,
    resource_type: isVideo ? 'video' : 'image',
  };
};