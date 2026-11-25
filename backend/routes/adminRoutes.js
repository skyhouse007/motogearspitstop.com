//routes/adminRoutes.js

import express from 'express';
import {
  getDashboardStats,
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  getAllOrders,
  updateOrderStatus,
  deleteOrder,
  getAllProductsAdmin,
  updateStock,
  getRevenueStats
} from '../controllers/adminController.js';
import { protect } from '../middleware/authMiddleware.js';
import { adminOnly } from '../middleware/adminMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';
import {
  getCatalogProductAdmin,
  upsertCatalogProduct,
  patchCatalogProductStock,
} from '../controllers/catalogProductController.js';

const router = express.Router();

// All admin routes protected
router.use(protect, adminOnly);

// Dashboard
router.get('/dashboard', getDashboardStats);
router.get('/revenue', getRevenueStats);

// Users
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUserRole);
router.delete('/users/:id', deleteUser);

// Orders
router.get('/orders', getAllOrders);
router.put('/orders/:id', updateOrderStatus);
router.delete('/orders/:id', deleteOrder);

// Products
router.get('/products', getAllProductsAdmin);
router.put('/products/:id/stock', updateStock);

// Static catalog (products.js) overrides + Cloudinary media
router.get('/catalog-products/:catalogId', getCatalogProductAdmin);
router.put('/catalog-products/:catalogId', upload.array('images', 10), upsertCatalogProduct);
router.patch('/catalog-products/:catalogId/stock', patchCatalogProductStock);

export default router;