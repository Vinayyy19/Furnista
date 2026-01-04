const Cart = require("../models/cart.model");
const Product = require("../models/Product.model");
const Variant = require("../models/Varient.model");

/* =========================
   GET CART
========================= */
module.exports.getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id })
      .populate("items.product")
      .populate("items.variant");

    if (!cart) {
      cart = await Cart.create({
        user: req.user._id,
        items: [],
      });
    }

    res.status(200).json({
      success: true,
      cart,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   ADD TO CART
========================= */
module.exports.addToCart = async (req, res) => {
  try {
    const { productId, variantId, quantity } = req.body;

    if (!productId || !variantId || !quantity) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const product = await Product.findById(productId);
    const variant = await Variant.findById(variantId);

    if (!product || !variant) {
      return res.status(404).json({ message: "Product or Variant not found" });
    }

    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      cart = await Cart.create({
        user: req.user._id,
        items: [],
      });
    }

    const existingItem = cart.items.find(
      (item) =>
        item.product.toString() === productId &&
        item.variant.toString() === variantId
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({
        product: productId,
        variant: variantId,
        quantity,
        priceAtAddTime: variant.sellingPrice,
      });
    }

    await cart.save();

    const populatedCart = await Cart.findOne({ user: req.user._id })
      .populate("items.product")
      .populate("items.variant");

    res.status(200).json({
      success: true,
      cart: populatedCart,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   UPDATE CART QUANTITY
========================= */
module.exports.updateCartQty = async (req, res) => {
  try {
    const { productId, variantId, quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({ message: "Quantity must be >= 1" });
    }

    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const item = cart.items.find(
      (i) =>
        i.product.toString() === productId &&
        i.variant.toString() === variantId
    );

    if (!item) {
      return res.status(404).json({ message: "Item not in cart" });
    }

    item.quantity = quantity;
    await cart.save();

    const updatedCart = await Cart.findOne({ user: req.user._id })
      .populate("items.product")
      .populate("items.variant");

    res.status(200).json({
      success: true,
      cart: updatedCart,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================
   REMOVE FROM CART
========================= */
module.exports.removeFromCart = async (req, res) => {
  try {
    const { productId, variantId } = req.params;

    const cart = await Cart.findOneAndUpdate(
      { user: req.user._id },
      {
        $pull: {
          items: {
            product: productId,
            variant: variantId,
          },
        },
      },
      { new: true }
    )
      .populate("items.product")
      .populate("items.variant");

    res.status(200).json({
      success: true,
      cart,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
