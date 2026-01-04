const { validationResult } = require("express-validator");
const Admin = require("../models/Admin.model");
const Order = require("../models/order.model");
const User = require("../models/user.model");
const Variant = require("../models/Varient.model");
const Product = require("../models/Product.model");
const Category = require("../models/Category.model");

module.exports.getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id).select("-password");
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }
    res.status(200).json({
      message: "Admin profile retrieved",
      admin,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
      error,
    });
  }
};

module.exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().select("-password");
    res.status(200).json({
      message: "All admins retrieved",
      admins,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
      error,
    });
  }
};

module.exports.AdminLogin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: errors.array()[0].msg,
      });
    }

    const { email, password } = req.body;

    const admin = await Admin.findOne({ email }).select("+password");
    if (!admin) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = admin.generateAuthToken();

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: "Login successful",
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports.AdminRegister = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: errors.array()[0].msg,
      });
    }

    const { name, email, password, role } = req.body;

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(409).json({
        message: "Admin already exists with this email",
      });
    }

    const admin = await Admin.create({
      name,
      email,
      password,
      role,
    });

    const token = admin.generateAuthToken();

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 24h
    });

    res.status(201).json({
      message: "Admin registered successfully",
      token,
      admin,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports.updateAdminProfile = async (req, res) => {
  try {
    const { adminId } = req.params;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: errors.array()[0].msg,
      });
    }

    const { name, role } = req.body;

    const admin = await Admin.findByIdAndUpdate(
      adminId,
      { name, role },
      { new: true, runValidators: true }
    ).select("-password");

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.status(200).json({
      message: "Admin profile updated successfully",
      admin,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
      error,
    });
  }
};

module.exports.updateAdminPassword = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Old password and new password are required" });
    }

    const admin = await Admin.findById(adminId).select("+password");
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const isMatch = await admin.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(401).json({ message: "Old password is incorrect" });
    }

    admin.password = newPassword;
    await admin.save();

    res.status(200).json({
      message: "Password updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
      error,
    });
  }
};

module.exports.deleteAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;

    const admin = await Admin.findByIdAndDelete(adminId);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.status(200).json({
      message: "Admin deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
      error,
    });
  }
};

module.exports.dashBoard = async (req, res) => {
  try {
    const now = new Date();

    const startOfToday = new Date(now.setHours(0, 0, 0, 0));

    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );

    const startOfLastMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth() - 1,
      1
    );

    /* ===========================
       ORDER STATS
    ============================ */

    const [
      todayOrders,
      thisMonthOrders,
      totalOrders,
      pendingOrders,
    ] = await Promise.all([
      Order.countDocuments({ createdAt: { $gte: startOfToday } }),
      Order.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Order.countDocuments(),
      Order.countDocuments({ currentStatus: { $ne: "DELIVERED" } }),
    ]);

    /* ===========================
       USER STATS
    ============================ */

    const [todayUsers, thisMonthUsers] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: startOfToday } }),
      User.countDocuments({ createdAt: { $gte: startOfMonth } }),
    ]);

    /* ===========================
       ORDERS BY STATUS (CHART)
    ============================ */

    const ordersByStatusRaw = await Order.aggregate([
      {
        $group: {
          _id: "$currentStatus",
          count: { $sum: 1 },
        },
      },
    ]);

    const ordersByStatus = ordersByStatusRaw.map((item) => ({
      status: item._id,
      count: item.count,
    }));

    /* ===========================
       MONTHLY COMPARISON
    ============================ */

    const [thisMonth, lastMonth] = await Promise.all([
      Order.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Order.countDocuments({
        createdAt: { $gte: startOfLastMonth, $lt: startOfMonth },
      }),
    ]);

    /* ===========================
       TOP CATEGORIES
    ============================ */

    const categoryStats = await Order.aggregate([
      { $unwind: "$items" },
      {
        $lookup: {
          from: "variants",
          localField: "items.variantId",
          foreignField: "_id",
          as: "variant",
        },
      },
      { $unwind: "$variant" },
      {
        $lookup: {
          from: "products",
          localField: "variant.productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $lookup: {
          from: "categories",
          localField: "product.categoryId",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      {
        $group: {
          _id: "$category.name",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    const topCategories = categoryStats.map((c) => ({
      category: c._id,
      count: c.count,
    }));

    /* ===========================
       FINAL RESPONSE
    ============================ */

    res.status(200).json({
      success: true,
      stats: {
        todayOrders,
        thisMonthOrders,
        totalOrders,
        pendingOrders,
        todayUsers,
        thisMonthUsers,
      },
      ordersByStatus,
      monthlyComparison: {
        thisMonth,
        lastMonth,
      },
      topCategories,
    });
  } catch (err) {
    console.error("Dashboard Error:", err);
    res.status(500).json({
      message: "Failed to load dashboard data",
    });
  }
};
