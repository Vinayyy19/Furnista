const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const {body} = require("express-validator");
const authMiddleware = require('../middlewares/auth.middleware');

router.post("/register",
  [
    body("email")
      .isEmail()
      .withMessage("Please provide a valid email address"),

    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),

    body("name")
      .notEmpty()
      .withMessage("name is required"),
    
    body("phoneNumber")
      .notEmpty()
      .isLength({ min: 10 })
      .withMessage("Phone number is required"),
  ],
  userController.registerUser
);

router.post("/login",
  [
    body("email")
      .isEmail()
      .withMessage("Please provide a valid email address"),
    body("password")
      .notEmpty()
      .withMessage("Password is required"),
  ],
  userController.loginUser
);

router.get('/profile', authMiddleware.authUser, userController.getUserProfile);

router.post('/logout', authMiddleware.authUser, userController.logoutUser);

router.patch('/update', authMiddleware.authUser, userController.updateUser);

module.exports = router;