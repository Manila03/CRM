import { Router } from 'express';
import {
  getPipelineSummary,
  getSalesPerformance,
  getLeadConversionReport
} from '../controllers/report.controller.js';
import { protect } from '../middlewares/auth.js';

const router = Router();

router.use(protect);

router.get('/pipeline', getPipelineSummary);
router.get('/sales', getSalesPerformance);
router.get('/leads', getLeadConversionReport);

export default router;
