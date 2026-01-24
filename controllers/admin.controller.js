const { validationResult } = require("express-validator");
const Admin = require("../models/Admin.model");
const Order = require("../models/order.model");
const User = require("../models/user.model");
const contactUsForm = require("../models/ContactUs.model");
const isProd = process.env.NODE_ENV === "production";

module.exports.getAllAdmins = async (req, res) => {
  if (req.admin.role !== "admin") {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    const admins = await Admin.find().select("-password");
    res.status(200).json({
      message: "All admins retrieved",
      admins,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
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
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: "Login successful",
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports.AdminRegister = async (req, res) => {
  if (req.admin.role !== "admin") {
    return res.status(403).json({ message: "Access denied" });
  }

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

    res.status(201).json({
      message: "Admin registered successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports.deleteAdmin = async (req, res) => {
  if (req.admin.role !== "admin") {
    return res.status(403).json({ message: "Access denied" });
  }
  const { adminId } = req.params;

  if (req.admin._id.toString() === adminId) {
    return res.status(400).json({
      message: "Admin cannot delete self",
    });
  }

  try {
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
    });
  }
};

module.exports.dashBoard = async (req, res) => {
  if (!["admin", "salesMan"].includes(req.admin.role)) {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    const now = new Date();

    const startOfToday = new Date(now.setHours(0, 0, 0, 0));

    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    );

    const startOfLastMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth() - 1,
      1,
    );

    const [todayOrders, thisMonthOrders, totalOrders, pendingOrders] =
      await Promise.all([
        Order.countDocuments({ createdAt: { $gte: startOfToday } }),
        Order.countDocuments({ createdAt: { $gte: startOfMonth } }),
        Order.countDocuments(),
        Order.countDocuments({ currentStatus: { $ne: "DELIVERED" } }),
      ]);

    const [todayUsers, thisMonthUsers] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: startOfToday } }),
      User.countDocuments({ createdAt: { $gte: startOfMonth } }),
    ]);

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

    const [thisMonth, lastMonth] = await Promise.all([
      Order.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Order.countDocuments({
        createdAt: { $gte: startOfLastMonth, $lt: startOfMonth },
      }),
    ]);

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

module.exports.getMsg = async (req, res) => {
  if (!["admin", "salesMan"].includes(req.admin.role)) {
    return res.status(403).json({ message: "Access denied" });
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const { type } = req.query;

  try {
    const filter = {};
    if (type) {
      filter.type = type;
    }

    const messages = await contactUsForm
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await contactUsForm.countDocuments(filter);

    return res.status(200).json({
      message: "Messages fetched successfully",
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data: messages,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Failed to fetch messages",
    });
  }
};

module.exports.adminLogout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
  });

  res.status(200).json({ message: "Logged out successfully" });
};
