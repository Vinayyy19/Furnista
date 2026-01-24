const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const connectDB = require("./db/db");
const userRoutes = require("./routes/user.routes");
const productRoutes = require("./routes/product.routes");
const adminRoutes = require("./routes/admin.routes");
const cartRoutes = require('./routes/cart.routes');
const orderRoutes = require('./routes/order.routes');

const app = express();

(async () => {
  try {
    await connectDB();
  } catch (err) {
    console.log(err);
  }
})();


app.use(cookieParser());

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.get("/", (req, res) => {
  res.send("Hello");
});

app.use("/users", userRoutes);
app.use("/product", productRoutes);
app.use("/admin", adminRoutes);
app.use("/cart",cartRoutes);
app.use("/orders",orderRoutes);

module.exports = app;
