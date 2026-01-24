const Admin = require("../models/Admin.model");
const jwt = require("jsonwebtoken");

module.exports.authUser = (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token)
      return res.status(401).json({ message: "Authentication required" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      _id: decoded.id,
    };
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ message: "Session expired. Please login again." });
    }
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports.authAdmin = async (req, res, next) => {
  try {
    let token;
    if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.id).select("-password");
    if (!admin) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    req.admin = admin;
    req.token = token;
    next();
  } catch (error) {
    console.error("Authentication error:", error.message);
    return res.status(401).json({ message: "Unauthorized" });
  }
};
