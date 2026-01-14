const Cart = require("../models/cart.model");
const Order = require("../models/order.model");
const contactUsForm = require("../models/ContactUs.model");

module.exports.mockPaymentSuccess = async (req, res) => {
  try {
    const userId = req.user._id;

    const cart = await Cart.findOne({ user: userId })
      .populate("items.product")
      .populate("items.variant");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    const orderItems = cart.items.map((item) => {
      return {
        productId: item.product._id,
        variantId: item.variant._id,
        productName: item.product.name,
        color: item.variant.color,
        size: item.variant.size,
        unitPrice: item.priceAtAddTime,
        marketPrice: item.variant.marketPrice,
        quantity: item.quantity,
        subtotal: item.quantity * item.priceAtAddTime,
      };
    });

    const itemsTotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);

    const shippingFee = itemsTotal > 0 ? 49 : 0;
    const finalAmount = itemsTotal + shippingFee;

    const order = await Order.create({
      userId,
      items: orderItems,
      pricing: {
        itemsTotal,
        shippingFee,
        finalAmount,
      },
      deliveryAddress: req.user.address,
      currentStatus: "BOOKED",
      statusUpdatedAt: new Date(),
      events: [
        {
          type: "ORDER_BOOKED",
          message: "Order booked successfully",
        },
      ],
    });

    cart.items = [];
    await cart.save();

    return res.status(201).json({
      message: "Order booked successfully",
      orderId: order._id,
    });
  } catch (error) {
    console.error("Mock payment error:", error);
    return res.status(500).json({ message: "Order booking failed" });
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
      message: "Failed to send message. Please use phone or email to contact directly.",
    });
  }
};

module.exports.saveBulkOrder = async (req,res) => {
  const {email,mobile,requirements,pincode,organisation,name} = req.body;

  if (!name || !mobile || !organisation || !requirements || !pincode || !email) {
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
      category : organisation,
      description : requirements,
      type: "bulkOrder",
    });

    return res.status(201).json({
      message: "Message sent successfully",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Failed to send message. Please use phone or email to contact directly.",
    });
  }
}

module.exports.deleteorder = async (req,res) => {
  try{
    const {id} = req.params;
    const deletedOrder = await Order.findByIdAndDelete(id);
    if(!deletedOrder){
      return res.status(404).json({
        message:"Order not found",
      });
    }
    return res.status(200).json({
        message:"Order Deleted Successfully",
      });
  }catch(err){
    res.status(500).json({
      message:"Failed to delete Order",
    });
  }
}