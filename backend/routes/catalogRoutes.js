import express from 'express';
import { getCatalogOverrides } from '../controllers/catalogProductController.js';

const router = express.Router();

router.get('/overrides', getCatalogOverrides);

export default router;