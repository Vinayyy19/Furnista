const productModel = require("../models/Product.model");
const CategoryModel = require("../models/Category.model");
const varientModel = require("../models/Varient.model");
const uploadToCloudinary = require("../services/CloudinaryUpload");
const featureModel = require('../models/featuredProduct.model');
const mongoose = require("mongoose");

module.exports.addProduct = async (req, res) => {
  try {
    const { name, description, categoryId, material, dimensions } = req.body;

    if (!name || !description || !categoryId || !material) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    const categoryExists = await CategoryModel.findById(categoryId);
    if (!categoryExists) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (!req.files || req.files.length < 1) {
      return res.status(400).json({ message: "At least one image required" });
    }

    if (req.files.length > 6) {
      return res.status(400).json({ message: "Maximum 6 images allowed" });
    }

    const images = [];
    for (let i = 0; i < req.files.length; i++) {
      const uploaded = await uploadToCloudinary(req.files[i].buffer);
      images.push({
        url: uploaded.url,
        publicId: uploaded.publicId,
        isPrimary: i === 0,
      });
    }

    const product = await productModel.create({
      name,
      description,
      categoryId,
      material,
      dimensions,
      images,
    });

    res.status(201).json({
      message: "Product created successfully",
      product,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports.addCategory = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Category name is required" });
    }

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: "Category image is required" });
    }

    // ✅ THIS IS THE FIX
    const imageUpload = await uploadToCloudinary(
      req.file.buffer,
      "categories"
    );

    const category = await CategoryModel.create({
      name,
      imageUrl: imageUpload.url,
      imagePublicId: imageUpload.publicId,
    });

    res.status(201).json({
      success: true,
      category,
    });
  } catch (error) {
    console.error("Add category error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


module.exports.addVarient = async (req, res) => {
  try {
    const { productId, color, size, sellingPrice, marketPrice, stockQty, sku } =
      req.body;

    if (
      !productId ||
      !color ||
      !size ||
      sellingPrice === undefined ||
      marketPrice === undefined ||
      stockQty === undefined
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const productExists = await productModel.findById(productId);
    if (!productExists) {
      return res.status(404).json({ message: "Product not found" });
    }

    const variant = await varientModel.create({
      productId,
      color,
      size,
      sellingPrice,
      marketPrice,
      stockQty,
      sku,
    });

    res.status(201).json({
      message: "Variant created successfully",
      variant,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "SKU already exists" });
    }
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports.getCategories = async (req, res) => {
  try{
    const categories = await CategoryModel.find({});
    return res.status(200).json({
      success:true,
      categories
    });
  }catch(err){
    return res.status(500).json({
      success:false,
      message:"Failed to fetch categories",
    });
  }
}


module.exports.getAllProducts = async (req, res) => {
  try{
    const Product = await productModel.find({}).populate("categoryId", "name")
    return res.status(200).json({
      success:true,
      Product
    });
  }catch(err){
    return res.status(500).json({
      success:false,
      message:"Failed to fetch categories",
    });
  }
}


module.exports.toggleFeatured = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await productModel.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const alreadyFeatured = await featureModel.findOne({ productId: id });

    if (alreadyFeatured) {
      await featureModel.deleteOne({ productId: id });
      return res.status(200).json({
        success: true,
        featured: false,
        message: "Removed from featured products",
      });
    }
    await featureModel.create({ productId: id });
    return res.status(200).json({
      success: true,
      featured: true,
      message: "Added to featured products",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server Error" });
  }
};

module.exports.getFeaturedProducts = async (req, res) => {
  try {
    const featured = await featureModel.aggregate([
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $lookup: {
          from: "variants",
          localField: "product._id",
          foreignField: "productId",
          as: "variants",
        },
      },
      {
        $project: {
          _id: "$product._id",
          name: "$product.name",
          description: "$product.description",
          images: "$product.images",
          material: "$product.material",
          variants: 1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      products: featured,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const products = await productModel.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(id) },
      },
      {
        $lookup: {
          from: "variants",
          localField: "_id",
          foreignField: "productId",
          as: "variants",
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "categoryId",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      {
        $project: {
          name: 1,
          description: 1,
          images: 1,
          material: 1,
          dimensions: 1,
          variants: 1,
          category: { name: 1 },
        },
      },
    ]);

    if (!products.length) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      product: products[0],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

module.exports.getProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { minPrice, maxPrice, material } = req.query;

    const matchStage = {
      categoryId: new mongoose.Types.ObjectId(categoryId),
    };

    if (material) {
      matchStage.material = material;
    }

    const pipeline = [
      { $match: matchStage },

      {
        $lookup: {
          from: "variants",
          localField: "_id",
          foreignField: "productId",
          as: "variants",
        },
      },
    ];

    if (minPrice || maxPrice) {
      pipeline.push({
        $match: {
          "variants.sellingPrice": {
            ...(minPrice && { $gte: Number(minPrice) }),
            ...(maxPrice && { $lte: Number(maxPrice) }),
          },
        },
      });
    }

    pipeline.push(
      {
        $lookup: {
          from: "categories",
          localField: "categoryId",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      {
        $project: {
          name: 1,
          description: 1,
          images: 1,
          material: 1,
          variants: 1,
          category: { name: 1 },
        },
      }
    );

    const products = await productModel.aggregate(pipeline);

    return res.status(200).json({
      success: true,
      products,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

module.exports.recommendProducts = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await productModel.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const products = await productModel.aggregate([
      {
        $match: {
          categoryId: product.categoryId,
          _id: { $ne: product._id },
        },
      },
      {
        $lookup: {
          from: "variants",
          localField: "_id",
          foreignField: "productId",
          as: "variants",
        },
      },
      { $limit: 10 },
    ]);

    return res.status(200).json({
      success: true,
      products,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
