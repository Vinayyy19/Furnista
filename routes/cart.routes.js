const express = require("express");
const router = express.Router();
const cartController = require("../controllers/Cart.controller");
const authMiddleware = require("../middlewares/auth.middleware");

router.get("/", authMiddleware.authUser, cartController.getCart);

router.post("/add", authMiddleware.authUser, cartController.addToCart);

router.patch("/update", authMiddleware.authUser, cartController.updateCartQty);

router.delete(
  "/remove/:productId/:variantId",
  authMiddleware.authUser,
  cartController.removeFromCart
);

module.exports = router;
