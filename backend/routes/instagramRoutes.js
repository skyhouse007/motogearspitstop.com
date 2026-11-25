import express from 'express';
import { getInstagramReels } from '../controllers/instagramController.js';

const router = express.Router();

router.get('/reels', getInstagramReels);

export default router;