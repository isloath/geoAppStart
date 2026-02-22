import { Router } from 'express';
import { AnalysisRequestSchema } from '../schema.js';
import { runAnalysis } from '../services/runAnalysis.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const validationResult = AnalysisRequestSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({ error: 'Invalid input', details: validationResult.error.issues });
      return;
    }

    const analysisId = await runAnalysis(validationResult.data);

    res.status(202).json({ 
      message: 'Analysis started', 
      analysis_id: analysisId,
      status_url: `/api/analysis/${analysisId}`
    });

  } catch (error: any) {
    logger.error('Error in /analyze:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
