import express from 'express';
import { initDb } from './db.js';
import analyzeRouter from './routes/analyze.js';
import analysisRouter from './routes/analysis.js';
import insightsRouter from './routes/insights.js';
import { logger } from './utils/logger.js';

// Initialize Database
initDb();

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());

// Routes
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api/analyze', analyzeRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/analysis', insightsRouter); // Mounts on /api/analysis/:id/insights

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on http://0.0.0.0:${PORT}`);
});
