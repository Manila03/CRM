import { Router } from 'express';
import {
  getActivities,
  createActivity,
  deleteActivity
} from '../controllers/activity.controller.js';
import { protect } from '../middlewares/auth.js';

const router = Router();

router.use(protect);

router.route('/')
  .get(getActivities)
  .post(createActivity);

router.route('/:id')
  .delete(deleteActivity);

export default router;
