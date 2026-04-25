const cloudinary = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// 4 Cloudinary accounts - each for a different purpose
// Account 1: Sales (lead attachments + interaction images)
const salesCloud = cloudinary.v2;
const salesConfig = {
  cloud_name: process.env.CLOUDINARY_SALES_NAME,
  api_key: process.env.CLOUDINARY_SALES_KEY,
  api_secret: process.env.CLOUDINARY_SALES_SECRET,
};

// Account 2: Design (design approval images)
const { v2: designCloud } = require('cloudinary');
const designCloudInstance = require('cloudinary').v2;

// Since cloudinary v2 is a singleton we create separate upload instances manually
const cloudinaryLib = require('cloudinary');

function buildUploader(config) {
  const instance = cloudinaryLib.v2;
  // We'll use the upload API directly with explicit credentials
  return {
    upload: (filePath, opts) =>
      new Promise((resolve, reject) => {
        instance.uploader.upload(
          filePath,
          { ...opts, ...config },
          (err, result) => (err ? reject(err) : resolve(result))
        );
      }),
    destroy: (publicId) =>
      new Promise((resolve, reject) => {
        instance.uploader.destroy(
          publicId,
          config,
          (err, result) => (err ? reject(err) : resolve(result))
        );
      }),
  };
}

// Build multer middleware using direct upload (base64 in memory then upload)
const memoryStorage = multer.memoryStorage();

function buildMulterMiddleware(fieldName, maxCount = 10) {
  return multer({
    storage: memoryStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
      const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
                       'application/pdf'];
      if (allowed.includes(file.mimetype)) cb(null, true);
      else cb(new Error('Only images and PDFs are allowed'));
    }
  }).array(fieldName, maxCount);
}

async function uploadToCloudinary(buffer, folder, accountType = 'SALES') {
  const configs = {
    SALES:  { cloud_name: process.env.CLOUDINARY_SALES_NAME,   api_key: process.env.CLOUDINARY_SALES_KEY,   api_secret: process.env.CLOUDINARY_SALES_SECRET },
    DESIGN: { cloud_name: process.env.CLOUDINARY_DESIGN_NAME,  api_key: process.env.CLOUDINARY_DESIGN_KEY,  api_secret: process.env.CLOUDINARY_DESIGN_SECRET },
    SITE:   { cloud_name: process.env.CLOUDINARY_SITE_NAME,    api_key: process.env.CLOUDINARY_SITE_KEY,    api_secret: process.env.CLOUDINARY_SITE_SECRET },
    DOCS:   { cloud_name: process.env.CLOUDINARY_DOCS_NAME,    api_key: process.env.CLOUDINARY_DOCS_KEY,    api_secret: process.env.CLOUDINARY_DOCS_SECRET },
  };

  const cfg = configs[accountType] || configs.SALES;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinaryLib.v2.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto',
        ...cfg,
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    const { Readable } = require('stream');
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
}

async function deleteFromCloudinary(publicId, accountType = 'SALES') {
  const configs = {
    SALES:  { cloud_name: process.env.CLOUDINARY_SALES_NAME,   api_key: process.env.CLOUDINARY_SALES_KEY,   api_secret: process.env.CLOUDINARY_SALES_SECRET },
    DESIGN: { cloud_name: process.env.CLOUDINARY_DESIGN_NAME,  api_key: process.env.CLOUDINARY_DESIGN_KEY,  api_secret: process.env.CLOUDINARY_DESIGN_SECRET },
    SITE:   { cloud_name: process.env.CLOUDINARY_SITE_NAME,    api_key: process.env.CLOUDINARY_SITE_KEY,    api_secret: process.env.CLOUDINARY_SITE_SECRET },
    DOCS:   { cloud_name: process.env.CLOUDINARY_DOCS_NAME,    api_key: process.env.CLOUDINARY_DOCS_KEY,    api_secret: process.env.CLOUDINARY_DOCS_SECRET },
  };
  const cfg = configs[accountType] || configs.SALES;
  return cloudinaryLib.v2.uploader.destroy(publicId, cfg);
}

module.exports = { buildMulterMiddleware, uploadToCloudinary, deleteFromCloudinary };
