const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET

  // LIVE MODE:
  // key_id: process.env.RAZORPAY_LIVE_KEY_ID,
  // key_secret: process.env.RAZORPAY_LIVE_KEY_SECRET
});

module.exports = razorpay;
