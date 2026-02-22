import { z } from 'zod';

export const AnalysisRequestSchema = z.object({
  brand_name: z.string().min(1),
  brand_domain: z.string().optional(),
  category: z.string().min(1),
  competitors: z.array(z.string()).min(1),
  prompts: z.array(z.string()).min(1),
});

export type AnalysisRequest = z.infer<typeof AnalysisRequestSchema>;
