import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { processDocument } from './documentProcessor.js';
import { queryDocuments } from './queryProcessor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer({ dest: 'uploads/' });

// Middleware
app.use(cors());
app.use(express.json());

// Ensure uploads directory exists
await fs.mkdir('uploads', { recursive: true });

// Routes
app.post('/api/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const result = await processDocument(req.file.path, req.file.originalname);
    await fs.unlink(req.file.path); // Clean up uploaded file
    
    res.json({ 
      message: 'Document processed successfully',
      chunks: result.chunks,
      source: req.file.originalname
    });
  } catch (error) {
    console.error('Error processing document:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.post('/api/query', async (req: Request, res: Response) => {
  try {
    const { question } = req.body as { question?: string };
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const result = await queryDocuments(question);
    res.json(result);
  } catch (error) {
    console.error('Error processing query:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 