import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/:id', (req, res) => {
  const analysisId = req.params.id;

  const getAnalysis = db.prepare('SELECT * FROM analyses WHERE id = ?');
  const analysis = getAnalysis.get(analysisId) as any;

  if (!analysis) {
    res.status(404).json({ error: 'Analysis not found' });
    return;
  }

  // Parse JSON fields for response
  analysis.competitors = JSON.parse(analysis.competitors_json);
  delete analysis.competitors_json;

  const getPrompts = db.prepare('SELECT * FROM prompts WHERE analysis_id = ?');
  const prompts = getPrompts.all(analysisId);

  const getLlmCalls = db.prepare('SELECT * FROM llm_calls WHERE analysis_id = ?');
  const llmCalls = getLlmCalls.all(analysisId).map((call: any) => {
    // Parse JSON fields for response if they exist
    try {
      if (call.request_json) call.request_json = JSON.parse(call.request_json);
      if (call.response_json) call.response_json = JSON.parse(call.response_json);
    } catch (e) {
      // Keep as string if parsing fails
    }
    return call;
  });

  res.json({
    analysis,
    prompts,
    llm_calls: llmCalls
  });
});

export default router;
