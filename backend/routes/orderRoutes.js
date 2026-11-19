//routes/orderRoutes.js



import express from 'express';
import {
  createOrder,
  getMyOrders,
  getOrderById,
  getFirstPurchaseEligibility
} from '../controllers/orderController.js';
import { protect, optionalProtect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', optionalProtect, createOrder);
router.get('/my', protect, getMyOrders);
router.get('/first-purchase-eligibility', protect, getFirstPurchaseEligibility);
router.get('/:id', optionalProtect, getOrderById);

export default router;