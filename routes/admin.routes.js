const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const adminController = require("../controllers/admin.controller");
const {authAdmin} = require("../middlewares/auth.middleware");

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

router.post("/register",authAdmin,
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

router.get('/getAdmin',authAdmin,adminController.getAllAdmins);

router.delete('/deleteAdmin/:adminId',authAdmin,adminController.deleteAdmin);

router.get('/dashboard',authAdmin,adminController.dashBoard);

router.get("/messages",authAdmin,adminController.getMsg);

router.post("/logout-admin",authAdmin,adminController.adminLogout);

router.get("/me", authAdmin, (req, res) => {
  res.status(200).json({
    admin: {
      id: req.admin._id,
      role: req.admin.role,
      name: req.admin.name,
    },
  });
});


module.exports = router;
