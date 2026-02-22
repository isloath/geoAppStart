import db from '../db.js';
import { openai } from '../openai_client.js';
import { AnalysisRequest } from '../schema.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

export async function runAnalysis(request: AnalysisRequest) {
  const analysisId = uuidv4();
  const createdAt = new Date().toISOString();

  // 1. Create Analysis Record
  const insertAnalysis = db.prepare(`
    INSERT INTO analyses (id, created_at, status, brand_name, brand_domain, category, competitors_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertAnalysis.run(
    analysisId,
    createdAt,
    'running',
    request.brand_name,
    request.brand_domain || null,
    request.category,
    JSON.stringify(request.competitors)
  );

  logger.info(`Analysis started: ${analysisId}`);

  // 2. Insert Prompts
  const insertPrompt = db.prepare(`
    INSERT INTO prompts (id, analysis_id, prompt_text)
    VALUES (?, ?, ?)
  `);

  const promptIds: { id: string; text: string }[] = [];
  for (const promptText of request.prompts) {
    const promptId = uuidv4();
    insertPrompt.run(promptId, analysisId, promptText);
    promptIds.push({ id: promptId, text: promptText });
  }

  // 3. Process Prompts (Async, but we await here for simplicity as requested "sequentially or parallel")
  // We will run them sequentially to avoid rate limits on free tiers and keep logic simple.
  
  // Note: In a real production app, this should be offloaded to a background job queue.
  // Since we are returning 202, we should NOT await the entire process in the request handler.
  // However, for this MVP, we will trigger the processing asynchronously without awaiting it in the controller.
  
  processPrompts(analysisId, promptIds).catch(err => {
    logger.error(`Fatal error in analysis ${analysisId}:`, err);
    const updateStatus = db.prepare('UPDATE analyses SET status = ? WHERE id = ?');
    updateStatus.run('failed', analysisId);
  });

  return analysisId;
}

async function processPrompts(analysisId: string, prompts: { id: string; text: string }[]) {
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const insertLlmCall = db.prepare(`
    INSERT INTO llm_calls (
      id, analysis_id, prompt_id, model, request_json, 
      response_text, response_json, latency_ms, tokens_in, tokens_out, error, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const prompt of prompts) {
    const callId = uuidv4();
    const startTime = Date.now();
    const requestPayload = {
      model: model,
      messages: [{ role: 'user', content: prompt.text }],
      temperature: 0,
    };

    let responseText: string | null = null;
    let responseJson: string | null = null;
    let tokensIn: number | null = null;
    let tokensOut: number | null = null;
    let error: string | null = null;

    try {
      const completion = await openai.chat.completions.create(requestPayload as any);
      const latency = Date.now() - startTime;

      responseText = completion.choices[0]?.message?.content || null;
      responseJson = JSON.stringify(completion);
      tokensIn = completion.usage?.prompt_tokens || null;
      tokensOut = completion.usage?.completion_tokens || null;

      insertLlmCall.run(
        callId,
        analysisId,
        prompt.id,
        model,
        JSON.stringify(requestPayload),
        responseText,
        responseJson,
        latency,
        tokensIn,
        tokensOut,
        null, // No error
        new Date().toISOString()
      );

    } catch (err: any) {
      const latency = Date.now() - startTime;
      error = err.message || String(err);
      logger.error(`Error processing prompt ${prompt.id}: ${error}`);

      insertLlmCall.run(
        callId,
        analysisId,
        prompt.id,
        model,
        JSON.stringify(requestPayload),
        null,
        null,
        latency,
        null,
        null,
        error,
        new Date().toISOString()
      );
    }
  }

  const updateStatus = db.prepare('UPDATE analyses SET status = ? WHERE id = ?');
  updateStatus.run('done', analysisId);
  logger.info(`Analysis ${analysisId} completed.`);
}
