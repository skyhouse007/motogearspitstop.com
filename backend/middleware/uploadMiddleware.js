//backend/middleware/uploadMiddleware.js

import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import '../config/cloudinary.js';

const storage = multer.memoryStorage();
const maxUploadMb = Number(process.env.CLOUDINARY_MAX_UPLOAD_MB) || 100;

export const upload = multer({
  storage,
  limits: { fileSize: maxUploadMb * 1024 * 1024 },
});

const defaultUploadFolder = () => {
  const folder = process.env.CLOUDINARY_UPLOAD_FOLDER;
  if (folder === undefined || folder === null) return '';
  return String(folder).trim();
};

/**
 * Upload into your existing Cloudinary cloud (CLOUDINARY_* env).
 * Does not create a new account. Uses unique public_id + overwrite: false so
 * existing product/gallery assets are not replaced.
 */
const isVideoUpload = (file, options = {}) => {
  if (options.resource_type === 'video') return true;
  if (options.resource_type === 'image') return false;
  return Boolean(file?.mimetype?.startsWith('video/'));
};

export const uploadToCloudinary = async (file, options = {}) => {
  const folder = options.folder ?? defaultUploadFolder();
  const isVideo = isVideoUpload(file, options);
  const uploadOptions = {
    resource_type: isVideo ? 'video' : 'image',
    overwrite: false,
    unique_filename: true,
    use_filename: Boolean(options.use_filename),
  };

  if (folder) {
    uploadOptions.folder = folder;
  }

  if (options.public_id) {
    uploadOptions.public_id = options.public_id;
  }

  if (!isVideo && process.env.CLOUDINARY_UPLOAD_RESIZE !== 'false') {
    uploadOptions.transformation = [{ width: 1600, quality: 'auto:good' }];
  }

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(uploadOptions, (error, result) => {
        if (error) reject(error);
        else resolve({
          public_id: result.public_id,
          url: result.secure_url,
          resource_type: result.resource_type || uploadOptions.resource_type,
        });
      })
      .end(file.buffer);
  });
};

export default upload;