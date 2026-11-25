//server.js
import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import connectDB from './config/db.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import productRoutes from './routes/productRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import shipmentRoutes from './routes/shipmentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import metaRoutes from './routes/metaRoutes.js';
import instagramRoutes from './routes/instagramRoutes.js';
import catalogRoutes from './routes/catalogRoutes.js';

dotenv.config();
connectDB();

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(morgan('dev'));

const normalizeOrigin = (origin) => origin?.trim().replace(/\/$/, '');

const allowedOrigins = [
  process.env.FRONTEND_URL,
  ...(process.env.ALLOWED_ORIGINS || '').split(',').map((origin) => origin.trim()),
  'https://motogearspitstop.com',
  'https://www.motogearspitstop.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://motogearspitstop.onrender.com',
  'https://motogearspitstop-com.onrender.com',
]
  .map(normalizeOrigin)
  .filter(Boolean);

const isLocalDevOrigin = (origin) => {
  if (!origin) return true;
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== 'http:' && protocol !== 'https:') return false;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]') {
      return true;
    }
    // Vite dev server with --host (LAN testing)
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
    return false;
  } catch {
    return false;
  }
};

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    const normalized = normalizeOrigin(origin);
    if (allowedOrigins.includes(normalized)) {
      callback(null, true);
      return;
    }

    if (process.env.NODE_ENV !== 'production' && isLocalDevOrigin(origin)) {
      callback(null, true);
      return;
    }

    // Do not pass Error — that turns OPTIONS preflight into HTTP 500.
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`CORS blocked origin: ${origin}`);
    }
    callback(null, false);
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/shipment', shipmentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/meta', metaRoutes);
app.use('/api/instagram', instagramRoutes);
app.use('/api/catalog', catalogRoutes);

app.get('/', (req, res) => res.json({ message: 'MotoGearPitstop API Running' }));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
