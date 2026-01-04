const cloudinary = require("cloudinary").v2;
const fs = require("fs/promises");

cloudinary.config({
  cloud_name: process.env.Cloudinary_CloudName,
  api_key: process.env.Cloudinary_APIKEY,
  api_secret: process.env.Cloudinary_APISecret,
});

const uploadToCloudinary = async (localFilePath, folder = "products") => {
  if (!localFilePath) throw new Error("File path missing");

  try {
    const result = await cloudinary.uploader.upload(localFilePath, {
      folder,
      resource_type: "image",
    });

    await fs.unlink(localFilePath);

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (err) {
    try { await fs.unlink(localFilePath); } catch {}
    throw err;
  }
};

module.exports = uploadToCloudinary;
