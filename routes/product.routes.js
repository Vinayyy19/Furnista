const express = require('express');
const router = express.Router();
const upload = require("../middlewares/multer.middleware");
const productController = require('../controllers/product.controller');

router.post('/addCategory',upload.single("image"),productController.addCategory);

router.post(
  "/addProduct",
  upload.array("images", 6),
  productController.addProduct
);

router.post('/addVarient',productController.addVarient);

router.get('/getCategories',productController.getCategories);

router.get('/getAllProducts',productController.getAllProducts);

router.patch('/toggleFeatured/:id',productController.toggleFeatured);

router.get('/getFeaturedProducts', productController.getFeaturedProducts);

router.get('/getProduct/:id',productController.getProductById);

router.get("/category/:categoryId", productController.getProductsByCategory);

router.get("/recommend/:productId", productController.recommendProducts);



module.exports = router;