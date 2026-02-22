import db from '../db.js';

export function computeInsights(analysisId: string) {
  // 1. Get Analysis Data
  const getAnalysis = db.prepare('SELECT * FROM analyses WHERE id = ?');
  const analysis = getAnalysis.get(analysisId) as any;

  if (!analysis) {
    return null;
  }

  const brandName = analysis.brand_name.toLowerCase();
  const competitors = JSON.parse(analysis.competitors_json).map((c: string) => c.toLowerCase());

  // 2. Get Prompts and LLM Calls
  const getPrompts = db.prepare('SELECT * FROM prompts WHERE analysis_id = ?');
  const prompts = getPrompts.all(analysisId) as any[];

  const getLlmCalls = db.prepare('SELECT * FROM llm_calls WHERE analysis_id = ?');
  const llmCalls = getLlmCalls.all(analysisId) as any[];

  // Map calls by prompt_id for easy access
  const callsByPromptId = new Map();
  for (const call of llmCalls) {
    callsByPromptId.set(call.prompt_id, call);
  }

  const perPromptInsights = [];
  let mentionedCount = 0;

  for (const prompt of prompts) {
    const call = callsByPromptId.get(prompt.id);
    const responseText = call?.response_text?.toLowerCase() || '';
    
    const brandMentioned = responseText.includes(brandName);
    if (brandMentioned) {
      mentionedCount++;
    }

    const competitorsFound = competitors.filter((c: string) => responseText.includes(c));

    perPromptInsights.push({
      prompt_id: prompt.id,
      prompt_text: prompt.prompt_text,
      brand_mentioned: brandMentioned,
      competitors_found: competitorsFound
    });
  }

  const mentionRate = prompts.length > 0 ? mentionedCount / prompts.length : 0;

  return {
    analysis_id: analysisId,
    mention_rate: mentionRate,
    per_prompt: perPromptInsights
  };
}
