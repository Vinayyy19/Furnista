const productModel = require("../models/Product.model");
const CategoryModel = require("../models/Category.model");
const variantModel = require("../models/Varient.model");
const uploadToCloudinary = require("../services/CloudinaryUpload");
const featureModel = require('../models/featuredProduct.model');
const mongoose = require("mongoose");

module.exports.addCategory = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Category name is required" });
    }

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: "Category image is required" });
    }

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
};

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
};

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

const getPagination = (req) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 12, 50);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

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

    if (!req.files || req.files.length < 1 || req.files.length > 6) {
      return res.status(400).json({
        message: "Images must be between 1 and 6",
      });
    }

    const uploads = await Promise.all(
      req.files.map((file, index) =>
        uploadToCloudinary(file.buffer).then((img) => ({
          url: img.url,
          publicId: img.publicId,
          isPrimary: index === 0,
        }))
      )
    );

    const product = await productModel.create({
      name,
      description,
      categoryId,
      material,
      dimensions,
      images: uploads,
    });

    res.status(201).json({ success: true, product });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
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
      sellingPrice == null ||
      marketPrice == null ||
      stockQty == null
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const productExists = await productModel.exists({ _id: productId });
    if (!productExists) {
      return res.status(404).json({ message: "Product not found" });
    }

    const variant = await variantModel.create({
      productId,
      color,
      size,
      sellingPrice,
      marketPrice,
      stockQty,
      sku,
    });

    res.status(201).json({ success: true, variant });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "SKU already exists" });
    }
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports.getProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { material, minPrice, maxPrice, sort } = req.query;
    const { page, limit, skip } = getPagination(req);

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ message: "Invalid category id" });
    }

    const priceConditions = [];
    if (minPrice)
      priceConditions.push({ $gte: ["$$v.sellingPrice", Number(minPrice)] });
    if (maxPrice)
      priceConditions.push({ $lte: ["$$v.sellingPrice", Number(maxPrice)] });

    const sortStage =
      sort === "price_asc"
        ? { minVariantPrice: 1 }
        : sort === "price_desc"
        ? { minVariantPrice: -1 }
        : { createdAt: -1 };

    const basePipeline = [
      {
        $match: {
          categoryId: new mongoose.Types.ObjectId(categoryId),
          ...(material && { material }),
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
      ...(priceConditions.length
        ? [
            {
              $addFields: {
                variants: {
                  $filter: {
                    input: "$variants",
                    as: "v",
                    cond: { $and: priceConditions },
                  },
                },
              },
            },
            { $match: { "variants.0": { $exists: true } } },
          ]
        : []),
      {
        $addFields: {
          minVariantPrice: { $min: "$variants.sellingPrice" },
        },
      },
    ];

    const [countResult, products] = await Promise.all([
      productModel.aggregate([...basePipeline, { $count: "total" }]),
      productModel.aggregate([
        ...basePipeline,
        { $sort: sortStage },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            name: 1,
            description: 1,
            images: 1,
            material: 1,
            variants: 1,
            minVariantPrice: 1,
          },
        },
      ]),
    ]);

    const total = countResult[0]?.total || 0;

    res.status(200).json({
      success: true,
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports.searchProducts = async (req, res) => {
  try {
    const {
      q,
      minPrice,
      maxPrice,
      material,
      sort,
      page = 1,
      limit = 12,
    } = req.query;

    const safePage = Math.max(parseInt(page), 1);
    const safeLimit = Math.min(parseInt(limit), 50);
    const skip = (safePage - 1) * safeLimit;

    /* -------------------- Match Stage -------------------- */
    const matchStage = {};

    if (q) {
      matchStage.$text = { $search: q };
    }

    if (material) {
      matchStage.material = material;
    }

    /* -------------------- Price Filter -------------------- */
    const priceConditions = [];
    if (minPrice) {
      priceConditions.push({ $gte: ["$$v.sellingPrice", Number(minPrice)] });
    }
    if (maxPrice) {
      priceConditions.push({ $lte: ["$$v.sellingPrice", Number(maxPrice)] });
    }

    /* -------------------- Sort Logic -------------------- */
    const sortStage =
      sort === "price_asc"
        ? { minVariantPrice: 1 }
        : sort === "price_desc"
        ? { minVariantPrice: -1 }
        : q
        ? { score: { $meta: "textScore" } }
        : { createdAt: -1 };

    /* -------------------- Aggregation Pipeline -------------------- */
    const basePipeline = [
      { $match: matchStage },

      {
        $lookup: {
          from: "variants",
          localField: "_id",
          foreignField: "productId",
          as: "variants",
        },
      },

      ...(priceConditions.length
        ? [
            {
              $addFields: {
                variants: {
                  $filter: {
                    input: "$variants",
                    as: "v",
                    cond: { $and: priceConditions },
                  },
                },
              },
            },
            { $match: { "variants.0": { $exists: true } } },
          ]
        : []),

      {
        $addFields: {
          minVariantPrice: { $min: "$variants.sellingPrice" },
        },
      },

      ...(q ? [{ $addFields: { score: { $meta: "textScore" } } }] : []),
    ];

    /* -------------------- Execute Queries -------------------- */
    const [countResult, products] = await Promise.all([
      productModel.aggregate([...basePipeline, { $count: "total" }]),

      productModel.aggregate([
        ...basePipeline,
        { $sort: sortStage },
        { $skip: skip },
        { $limit: safeLimit },
        {
          $project: {
            name: 1,
            description: 1,
            images: 1,
            material: 1,
            minVariantPrice: 1,
            variants: 1,
          },
        },
      ]),
    ]);

    const total = countResult[0]?.total || 0;

    return res.status(200).json({
      success: true,
      products,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    });
  } catch (error) {
    console.error("Search products error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
