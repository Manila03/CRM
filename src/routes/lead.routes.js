import { Router } from 'express';
import {
  getLeads,
  getLead,
  createLead,
  updateLead,
  deleteLead,
  convertLead
} from '../controllers/lead.controller.js';
import { protect } from '../middlewares/auth.js';

const router = Router();

router.use(protect);

router.route('/')
  .get(getLeads)
  .post(createLead);

router.post('/:id/convert', convertLead);

router.route('/:id')
  .get(getLead)
  .put(updateLead)
  .delete(deleteLead);

export default router;
