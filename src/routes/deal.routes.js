import { Router } from 'express';
import {
  getDeals,
  getDeal,
  createDeal,
  updateDeal,
  deleteDeal
} from '../controllers/deal.controller.js';
import { protect } from '../middlewares/auth.js';

const router = Router();

router.use(protect);

router.route('/')
  .get(getDeals)
  .post(createDeal);

router.route('/:id')
  .get(getDeal)
  .put(updateDeal)
  .delete(deleteDeal);

export default router;
