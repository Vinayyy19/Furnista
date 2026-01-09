const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const adminController = require("../controllers/admin.controller");

router.post("/login",
  [
    body("email")
      .isEmail()
      .withMessage("Please provide a valid email address"),

    body("password")
      .notEmpty()
      .withMessage("Password is required"),
  ],
  adminController.AdminLogin
);

router.post("/register",
  [
    body("email")
      .isEmail()
      .withMessage("Please provide a valid email address"),

    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),

    body("name.firstName")
      .notEmpty()
      .withMessage("First name is required"),

    body("name.lastName")
      .notEmpty()
      .withMessage("Last name is required"),

    body("role")
      .isIn(["admin", "salesMan"])
      .withMessage("Invalid role"),
  ],
  adminController.AdminRegister
);

router.get('/getAdmin',adminController.getAllAdmins);

router.delete('/deleteAdmin/:adminId',adminController.deleteAdmin);

router.get('/dashboard',adminController.dashBoard);

router.get("/messages",adminController.getMsg);

module.exports = router;
