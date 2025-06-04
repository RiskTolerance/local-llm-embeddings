import { promises as fs } from 'fs';
import mammoth from 'mammoth';
import { pipeline, FeatureExtractionPipeline } from '@xenova/transformers';
import { Surreal } from '@tai-kun/surrealdb';
import { remark } from 'remark';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';
import { 
  ProcessedDocument, 
  DocumentChunk, 
  SurrealConfig, 
  SupportedFileType,
  SUPPORTED_FILE_TYPES,
  MAX_FILE_SIZE 
} from './types.js';

const EMBED_MODEL = 'Snowflake/snowflake-arctic-embed-m-v2.0';
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

// Process markdown content to plain text while preserving structure
async function processMarkdown(content: string): Promise<string> {
  const processor = unified()
    .use(remarkParse)
    .use(remarkStringify, {
      bullet: '-',
      listItemIndent: 'one',
      emphasis: '_',
      strong: '*',
      fences: true
    });

  const result = await processor.process(content);
  return result.toString();
}

function validateFileType(filename: string): SupportedFileType {
  const ext = filename.toLowerCase().split('.').pop() as string;
  if (!Object.keys(SUPPORTED_FILE_TYPES).includes(ext)) {
    throw new Error(`Unsupported file type: ${ext}. Supported types are: ${Object.keys(SUPPORTED_FILE_TYPES).join(', ')}`);
  }
  return ext as SupportedFileType;
}

async function validateFileSize(path: string): Promise<void> {
  const stats = await fs.stat(path);
  if (stats.size > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }
}

async function readText(path: string, originalName: string): Promise<string> {
  const ext = validateFileType(originalName);
  
  switch (ext) {
    case 'docx':
      const { value } = await mammoth.extractRawText({ path });
      return value;
    
    case 'md':
    case 'markdown':
      const mdContent = await fs.readFile(path, 'utf-8');
      return processMarkdown(mdContent);
    
    case 'txt':
      return fs.readFile(path, 'utf-8');
    
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}

function* chunkText(txt: string, targetTokens = 500): Generator<string> {
  // Split by paragraphs, preserving some structure
  const sections = txt.split(/\n\s*\n/);
  let buf = '';
  
  for (const section of sections) {
    // If section is too long, split it into sentences
    if (section.split(/\s+/).length > targetTokens) {
      const sentences = section.split(/(?<=[.!?])\s+/);
      for (const sentence of sentences) {
        buf += sentence + ' ';
        if (buf.split(/\s+/).length > targetTokens) {
          yield buf.trim();
          buf = '';
        }
      }
    } else {
      // If adding this section would exceed target, yield current buffer
      if (buf && (buf + section).split(/\s+/).length > targetTokens) {
        yield buf.trim();
        buf = section;
      } else {
        buf += (buf ? '\n\n' : '') + section;
      }
    }
  }
  
  if (buf.trim()) yield buf.trim();
}

export async function processDocument(filePath: string, originalName?: string): Promise<ProcessedDocument> {
  await validateFileSize(filePath);
  await initDB();
  await initModel();

  if (!extractor) {
    throw new Error('Embedding model not initialized');
  }

  if (!originalName) {
    throw new Error('Original filename is required for file type validation');
  }

  const raw = await readText(filePath, originalName);
  const chunks: DocumentChunk[] = [];
  
  // Convert generator to array for indexing
  const chunkArray = Array.from(chunkText(raw));
  for (let i = 0; i < chunkArray.length; i++) {
    const chunk = chunkArray[i];
    const vec = (await extractor(`document: ${chunk}`)).data[0];
    
    await db.create('rag_docs', {
      id: `${filePath}#${i}`,
      text: chunk,
      source: filePath,
      embedding: Array.from(vec)
    });

    chunks.push({
      id: `${filePath}#${i}`,
      text: chunk,
      source: filePath
    });
  }

  return { chunks };
} 