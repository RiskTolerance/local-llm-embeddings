export interface DocumentChunk {
  id: string;
  text: string;
  source: string;
}

export interface ProcessedDocument {
  chunks: DocumentChunk[];
}

export interface QueryResult {
  answer: string;
  citations: string[];
  context: Array<{
    text: string;
    source: string;
  }>;
}

export interface SurrealConfig {
  url: string;
  user: string;
  pass: string;
  ns: string;
  db: string;
}

export type SupportedFileType = 'txt' | 'md' | 'markdown' | 'docx';

export const SUPPORTED_FILE_TYPES: Record<SupportedFileType, string> = {
  txt: 'text/plain',
  md: 'text/markdown',
  markdown: 'text/markdown',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
};

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB 