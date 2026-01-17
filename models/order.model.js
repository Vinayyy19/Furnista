const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Variant",
      required: true,
    },

    productName: {
      type: String,
      required: true,
    },

    color: String,
    size: String,

    unitPrice: {
      type: Number,
      required: true,
    },

    marketPrice: Number,

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    subtotal: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const orderEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "ORDER_BOOKED",
        "ORDER_CONFIRMED",
        "ORDER_PACKED",
        "ORDER_SHIPPED",
        "ORDER_DELIVERED",
      ],
      required: true,
    },

    message: String,

    actor: {
      type: String,
      enum: ["SYSTEM", "ADMIN"],
      default: "SYSTEM",
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    items: {
      type: [orderItemSchema],
      required: true,
    },

    pricing: {
      itemsTotal: {
        type: Number,
        required: true,
      },
      taxAmount: {
        type: Number,
        default: 0,
      },
      shippingFee: {
        type: Number,
        default: 0,
      },
      finalAmount: {
        type: Number,
        required: true,
      },
    },

    currentStatus: {
      type: String,
      enum: ["BOOKED", "CONFIRMED", "PACKED", "SHIPPED", "DELIVERED"],
      default: "BOOKED",
      index: true,
    },

    statusUpdatedAt: {
      type: Date,
      default: Date.now,
    },
    razorpay: {
      paymentId: String,
      orderId: String,
    },

    deliveryAddress: {
      street: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      postalCode: {
        type: String,
        required: true,
      },
    },

    events: {
      type: [orderEventSchema],
      default: [],
    },
  },
  { timestamps: true }
);

orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Order", orderSchema);
