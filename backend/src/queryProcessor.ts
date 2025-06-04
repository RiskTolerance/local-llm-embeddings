import { pipeline, FeatureExtractionPipeline } from '@xenova/transformers';
import { Surreal } from '@tai-kun/surrealdb';
import fetch from 'node-fetch';
import { QueryResult, SurrealConfig } from './types.js';

const EMBED_MODEL = 'Snowflake/snowflake-arctic-embed-m-v2.0';
const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://ollama:11434';
const db = new Surreal();

// Initialize database connection
async function initDB(): Promise<void> {
  if (!db.connected) {
    const config: SurrealConfig = {
      url: process.env.SURREAL_URL ?? '',
      user: process.env.SURREAL_USER ?? '',
      pass: process.env.SURREAL_PASS ?? '',
      ns: process.env.SURREAL_NS ?? '',
      db: process.env.SURREAL_DB ?? ''
    };
    await db.connect(config.url, {
      user: config.user,
      pass: config.pass,
      ns: config.ns,
      db: config.db
    });
  }
}

// Initialize the embedding model
let extractor: FeatureExtractionPipeline | null = null;
async function initModel(): Promise<void> {
  if (!extractor) {
    extractor = await pipeline('feature-extraction', EMBED_MODEL) as FeatureExtractionPipeline;
  }
}

async function ollamaChat(prompt: string): Promise<string> {
  const r = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    body: JSON.stringify({ 
      model: 'mistral', 
      prompt, 
      stream: false 
    })
  });
  const { response } = await r.json() as { response: string };
  return response.trim();
}

export async function queryDocuments(question: string): Promise<QueryResult> {
  await initDB();
  await initModel();

  if (!extractor) {
    throw new Error('Embedding model not initialized');
  }

  const qVec = (await extractor(`query: ${question}`)).data[0];

  // SurrealQL similarity search (top-k = 4)
  const res = await db.query(
    'SELECT text, source, vector::distance::cosine(embedding, $vec) AS score ' +
    'FROM rag_docs ORDER BY score LIMIT 4',
    { vec: Array.from(qVec) }
  );

  const context = (res.flat()[0] as Array<{ text: string; source: string }>) || [];

  const prompt = 
`You are a helpful expert. Use ONLY the context to answer.

Context:
${context.map(c => '- ' + c.text.replace(/\n+/g, ' ')).join('\n')}
====
Q: ${question}
A:`;

  const answer = await ollamaChat(prompt);
  return { 
    answer, 
    citations: context.map(c => c.source),
    context: context.map(c => ({ text: c.text, source: c.source }))
  };
} 