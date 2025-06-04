# Local LLM Embeddings

A local document processing and question-answering system using vector embeddings and LLMs.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- [Node.js](https://nodejs.org/) v22 or later
- [pnpm](https://pnpm.io/) package manager
- (Optional) NVIDIA GPU with CUDA support for faster LLM inference

## Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd local-llm-embeddings
   ```

2. Start the services:
   ```bash
   docker-compose up -d
   ```

3. Pull the required LLM model:
   ```bash
   # Wait for Ollama service to be healthy, then:
   docker-compose exec ollama ollama pull mistral
   ```

4. Install dependencies:
   ```bash
   # Backend
   cd backend
   pnpm install

   # Frontend
   cd ../frontend
   pnpm install
   ```

## Usage

The system provides:
- Document ingestion (supports .txt, .md, .docx files)
- Vector embeddings using Snowflake's Arctic model
- Question answering using Mistral LLM
- Web interface for document upload and queries

Access the services at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- SurrealDB: ws://localhost:8000
- Ollama: http://localhost:11434

## Troubleshooting

### Docker Issues

1. If you see "docker-compose command not found":
   - Ensure Docker Desktop is installed and running
   - Try restarting Docker Desktop

2. If you see pipe errors:
   - Check if Docker Desktop is running
   - Restart Docker Desktop
   - On Windows, ensure WSL2 is properly configured

3. If Ollama fails to start:
   - Check Docker logs: `docker-compose logs ollama`
   - Ensure port 11434 is not in use
   - For GPU support, verify NVIDIA drivers and Docker GPU support

### Service Issues

1. If the backend can't connect to SurrealDB:
   - Check if SurrealDB is healthy: `docker-compose ps surrealdb`
   - View logs: `docker-compose logs surrealdb`

2. If document processing fails:
   - Check file size (max 10MB)
   - Verify file type is supported (.txt, .md, .docx)
   - Check backend logs: `docker-compose logs backend`

3. If LLM responses are slow:
   - Consider enabling GPU support in docker-compose.yml
   - Check Ollama logs: `docker-compose logs ollama`

## Development

### Backend

The backend service is built with:
- Node.js + TypeScript
- Express.js
- SurrealDB for vector storage
- @xenova/transformers for embeddings
- Ollama for LLM inference

### Frontend

The frontend is built with:
- SvelteKit
- TypeScript
- Modern UI components

## License

[Your chosen license] 