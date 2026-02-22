import { Router } from 'express';
import { computeInsights } from '../services/computeInsights.js';

const router = Router();

router.get('/:id/insights', (req, res) => {
  const analysisId = req.params.id;

  try {
    const insights = computeInsights(analysisId);

    if (!insights) {
      res.status(404).json({ error: 'Analysis not found' });
      return;
    }

    res.json(insights);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
