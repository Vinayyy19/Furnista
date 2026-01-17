const userModel = require("../models/user.model");
const userService = require("../services/user.service");
const { validationResult } = require("express-validator");

module.exports.registerUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: errors.array()[0].msg,
    });
  }
  try {
    const { name, email, password, phoneNumber } = req.body;
    const existingemail = await userModel.findOne({ email });
    if (existingemail) {
      return res.status(409).json({ message: "Email already in use" });
    }
    const existingnumber = await userModel.findOne({ phoneNumber });
    if (existingnumber) {
      return res.status(409).json({ message: "Phone number already in use" });
    }

    const hashedPassword = await userModel.hashPassword(password);

    const user = await userService.createUser({
      name,
      email,
      password: hashedPassword,
      phoneNumber,
    });

    const token = user.generateAuthToken();

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
      },
      token,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const message = Object.values(error.errors)[0].message;
      return res.status(400).json({ message });
    }
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(409).json({
        message: `${field} already exists`,
      });
    }
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports.loginUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: errors.array()[0].msg,
      });
    }

    const { email, password } = req.body;

    const user = await userModel.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = user.generateAuthToken();

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.status(200).json({
      message: "Login successful",
      user,
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports.getUserProfile = async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id).select("-password");
    return res.status(200).json({
      user,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch user profile",
    });
  }
};


module.exports.logoutUser = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });

    res.status(200).json({
      message: "Logout successful",
    });
  } catch (error) {
    res.status(500).json({
      message: "Logout failed",
    });
  }
};


module.exports.updateUser = async (req, res) => {
  try {
    const userId = req.user._id;

    const {
      firstName,
      lastName,
      phoneNumber,
      street,
      city,
      postalCode,
    } = req.body;

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.name) {
      user.name = { firstName: "", lastName: "" };
    }

    if (firstName !== undefined) user.name.firstName = firstName;
    if (lastName !== undefined) user.name.lastName = lastName;

    if (!user.name.firstName || !user.name.lastName) {
      return res.status(400).json({
        message: "First name and last name are required",
      });
    }

    if (phoneNumber !== undefined) {
      const existingNumber = await userModel.findOne({
        phoneNumber,
        _id: { $ne: userId },
      });

      if (existingNumber) {
        return res
          .status(409)
          .json({ message: "Phone number already in use" });
      }

      user.phoneNumber = phoneNumber;
    }

    if (!user.address) user.address = {};

    if (street !== undefined) user.address.street = street;
    if (city !== undefined) user.address.city = city;
    if (postalCode !== undefined)
      user.address.postalCode = postalCode;

    await user.save();

    return res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        address: user.address,
      },
    });
  } catch (error) {
    console.error("Update error:", error);
    return res.status(500).json({ message: "Failed to update profile" });
  }
};
