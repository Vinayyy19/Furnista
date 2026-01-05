const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.Cloudinary_CloudName,
  api_key: process.env.Cloudinary_APIKEY,
  api_secret: process.env.Cloudinary_APISecret,
});

const uploadToCloudinary = (buffer, folder = "products") => {
  if (!buffer) throw new Error("File buffer missing");

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
      },
      (error, result) => {
        if (error) return reject(error);

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    stream.end(buffer);
  });
};

module.exports = uploadToCloudinary;
