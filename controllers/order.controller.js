const Cart = require("../models/cart.model");
const Order = require("../models/order.model");
const contactUsForm = require("../models/ContactUs.model");
const Variant = require("../models/Varient.model");
const razorpay = require("../services/razorpay");
const crypto = require("crypto");

module.exports.createOrder = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id })
      .populate("items.product")
      .populate("items.variant");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    let itemsTotal = 0;

    cart.items.forEach((item) => {
      itemsTotal += item.quantity * item.variant.sellingPrice;
    });

    const shippingFee = 49;
    const finalAmount = itemsTotal + shippingFee;

    const razorpayOrder = await razorpay.orders.create({
      amount: finalAmount * 100,
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
    });

    return res.json({
      razorpayOrderId: razorpayOrder.id,
      amount: finalAmount,
      currency: "INR",
    });
  } catch (err) {
    console.error("order creation error:", err);
    res.status(500).json({ message: "Payment order failed" });
  }
};

module.exports.verifyOrder = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      deliveryAddress,
    } = req.body;

    const existingOrder = await Order.findOne({
      "razorpay.paymentId": razorpay_payment_id,
    });

    if (existingOrder) {
      return res.json({ success: true, orderId: existingOrder._id });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET) // TEST

      // LIVE MODE:
      // .createHmac("sha256", process.env.RAZORPAY_LIVE_KEY_SECRET)

      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Payment verification failed" });
    }

    const cart = await Cart.findOne({ user: req.user._id })
      .populate("items.product")
      .populate("items.variant");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    for (const item of cart.items) {
      const variant = await Variant.findById(item.variant._id);

      if (!variant || variant.stockQty < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${item.product.name}`,
        });
      }

      variant.stockQty -= item.quantity;
      await variant.save();
    }

    const orderItems = cart.items.map((item) => ({
      productId: item.product._id,
      variantId: item.variant._id,
      productName: item.product.name,
      color: item.variant.color,
      size: item.variant.size,
      unitPrice: item.variant.sellingPrice,
      marketPrice: item.variant.marketPrice,
      quantity: item.quantity,
      subtotal: item.quantity * item.variant.sellingPrice,
    }));

    const itemsTotal = orderItems.reduce((s, i) => s + i.subtotal, 0);

    const order = await Order.create({
      userId: req.user._id,
      items: orderItems,
      pricing: {
        itemsTotal,
        shippingFee: 49,
        finalAmount: itemsTotal + 49,
      },
      deliveryAddress,
      events: [
        {
          type: "ORDER_BOOKED",
          message: "Order placed successfully",
        },
      ],
      razorpay: {
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
      },
    });

    await Cart.deleteOne({ user: req.user._id });

    res.json({ success: true, orderId: order._id });
  } catch (err) {
    console.error("Verify order error:", err);
    res.status(500).json({ message: "Order creation failed" });
  }
};

module.exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

module.exports.getallOrders = async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      orders,
    });
  } catch (err) {
    console.error("Fetch orders error:", err);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

module.exports.editStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    if (!orderId || !status) {
      return res.status(400).json({
        message: "Order ID and status are required",
      });
    }

    const allowedStatuses = [
      "BOOKED",
      "CONFIRMED",
      "PACKED",
      "SHIPPED",
      "DELIVERED",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid order status",
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    order.currentStatus = status;
    order.statusUpdatedAt = new Date();

    order.events.push({
      type: `ORDER_${status}`,
      message: `Order marked as ${status}`,
      actor: "ADMIN",
      createdAt: new Date(),
    });

    await order.save();

    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      order,
    });
  } catch (err) {
    console.error("Edit order status error:", err);
    res.status(500).json({
      message: "Failed to update order status",
    });
  }
};

module.exports.SaveContactMsg = async (req, res) => {
  const { name, mobile, category, description, pincode, email } = req.body;

  if (!name || !mobile || !category || !description || !pincode || !email) {
    return res.status(400).json({
      message: "All fields are required",
    });
  }

  try {
    await contactUsForm.create({
      name,
      email,
      mobile,
      category,
      description,
      pincode,
      type: "contactUs",
    });

    return res.status(201).json({
      message: "Message sent successfully",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message:
        "Failed to send message. Please use phone or email to contact directly.",
    });
  }
};

module.exports.saveBulkOrder = async (req, res) => {
  const { email, mobile, requirements, pincode, organisation, name } = req.body;

  if (
    !name ||
    !mobile ||
    !organisation ||
    !requirements ||
    !pincode ||
    !email
  ) {
    return res.status(400).json({
      message: "All fields are required",
    });
  }

  try {
    await contactUsForm.create({
      name,
      email,
      mobile,
      pincode,
      category: organisation,
      description: requirements,
      type: "bulkOrder",
    });

    return res.status(201).json({
      message: "Message sent successfully",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message:
        "Failed to send message. Please use phone or email to contact directly.",
    });
  }
};

module.exports.deleteorder = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedOrder = await Order.findByIdAndDelete(id);
    if (!deletedOrder) {
      return res.status(404).json({
        message: "Order not found",
      });
    }
    return res.status(200).json({
      message: "Order Deleted Successfully",
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to delete Order",
    });
  }
};
