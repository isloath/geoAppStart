import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.resolve('analysis.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

export function initDb() {
  const schema = `
    CREATE TABLE IF NOT EXISTS analyses (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      status TEXT CHECK(status IN ('running', 'done', 'failed')) NOT NULL,
      brand_name TEXT NOT NULL,
      brand_domain TEXT,
      category TEXT NOT NULL,
      competitors_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS prompts (
      id TEXT PRIMARY KEY,
      analysis_id TEXT NOT NULL,
      prompt_text TEXT NOT NULL,
      FOREIGN KEY (analysis_id) REFERENCES analyses(id)
    );

    CREATE TABLE IF NOT EXISTS llm_calls (
      id TEXT PRIMARY KEY,
      analysis_id TEXT NOT NULL,
      prompt_id TEXT NOT NULL,
      model TEXT NOT NULL,
      request_json TEXT NOT NULL,
      response_text TEXT,
      response_json TEXT,
      latency_ms INTEGER,
      tokens_in INTEGER,
      tokens_out INTEGER,
      error TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (analysis_id) REFERENCES analyses(id),
      FOREIGN KEY (prompt_id) REFERENCES prompts(id)
    );

    CREATE INDEX IF NOT EXISTS idx_prompts_analysis_id ON prompts(analysis_id);
    CREATE INDEX IF NOT EXISTS idx_llm_calls_analysis_id ON llm_calls(analysis_id);
    CREATE INDEX IF NOT EXISTS idx_llm_calls_prompt_id ON llm_calls(prompt_id);
  `;

  db.exec(schema);
  console.log('Database initialized at', dbPath);
}

export default db;
