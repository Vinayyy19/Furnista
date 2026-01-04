const express = require("express");
const router = express.Router();
const orderController = require("../controllers/order.controller");
const authMiddleware = require("../middlewares/auth.middleware");

router.post(
  "/mock-payment-success",
  authMiddleware.authUser,
  orderController.mockPaymentSuccess
);

router.get(
    "/my-orders",
    authMiddleware.authUser,
    orderController.getMyOrders
);

router.get(
  "/all-orders",
  authMiddleware.authAdmin,
  orderController.getallOrders
);

router.patch(
  "/edit/:orderId/status",
  authMiddleware.authAdmin,
  orderController.editStatus
);

module.exports = router;
