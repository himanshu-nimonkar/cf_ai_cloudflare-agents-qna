# cf_ai_cloudflare-agents-qna

A production-ready documentation assistant chatbot for Cloudflare Agents SDK, featuring RAG-powered responses, real-time voice input, and a professional user interface.

## Live Demo

https://ai-chat-app.hnimonkar.workers.dev

## Project Overview

This AI-powered application is built on Cloudflare's platform and demonstrates:
- LLM integration using Llama 3.3 70B on Workers AI
- Workflow coordination via Durable Objects for state management
- User input through chat interface with Web Speech API voice support
- Memory and state persistence across sessions
- Retrieval Augmented Generation using Vectorize for accurate documentation Q&A

The chatbot specializes in answering questions about the Cloudflare Agents SDK and politely redirects users to stay within that topic scope.

## Features

- AI-powered Q&A using Llama 3.3 70B with Retrieval Augmented Generation
- Real-time voice input with Web Speech API
- Dark and light mode with instant theme switching
- Conversation search and history management
- Cost tracking and usage analytics
- Export conversations as JSON
- Responsive design with modern animations
- JWT authentication for secure access
- Industry-standard SVG icons throughout
- Markdown formatting in responses with proper styling

## Technology Stack

### Core Platform
- Cloudflare Workers - Serverless compute
- Workers AI - LLM inference with Llama 3.3 70B
- Durable Objects - Stateful coordination and memory
- Vectorize - Vector database for RAG

### Frontend
- Vanilla JavaScript with modern ES6+ modules
- Modular CSS architecture with custom properties
- Web Speech API for voice input
- SVG icons for professional UI

### Security
- JWT HS256 authentication
- CORS configuration
- Secure token-based API access

## Project Structure

```
cf_ai_cloudflare-agents-qna/
├── src/
│   ├── worker.js          # Main Worker entry point
│   ├── handlers.js        # API route handlers
│   ├── chat-room.js       # Durable Object class
│   ├── auth.js            # JWT authentication
│   └── utils.js           # Helper functions
├── static/
│   ├── index.html         # Frontend HTML structure
│   ├── styles.css         # All CSS styles (optimized, no unused code)
│   ├── app.js             # Frontend JavaScript
│   └── favicon.svg        # Application favicon
├── wrangler.toml          # Cloudflare configuration
├── sign_jwt.js            # JWT token generator for testing
├── docs-chunks.json       # Documentation embeddings data
├── PROMPTS.md             # AI prompts used in development
├── package.json
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js 18 or later
- Cloudflare account
- Wrangler CLI

### Installation

1. Clone the repository:
```bash
git clone https://github.com/himanshu-nimonkar/cf_ai_cloudflare-agents-qna.git
cd cf_ai_cloudflare-agents-qna
```

2. Install dependencies:
```bash
npm install
```

3. Create JWT secret:
```bash
npx wrangler secret put JWT_SECRET
```

4. Generate test token:
```bash
node sign_jwt.js
```

5. Deploy to Cloudflare:
```bash
npm run deploy
```

## Running Locally

Start the development server:
```bash
npm run dev
```

View live logs:
```bash
npm run tail
```

Test the deployed application at the URL provided after deployment.

## Configuration

### Cloudflare Bindings

The application uses these bindings configured in wrangler.toml:

- CHAT_DO - Durable Object for conversation management
- AI - Workers AI binding for LLM
- VECTORIZE - Vector database for RAG

### API Endpoints

- POST /api/chat - Send message and get AI response
- GET /api/history - Retrieve conversation history
- POST /api/clear - Clear conversation history
- POST /api/search - Search through conversations
- POST /api/preferences - Update user preferences
- GET /api/export - Export conversation data
- GET /api/health - Health check
- POST /api/embed-docs - Upload documentation embeddings

### Authentication

All API endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

Generate a test token using:
```bash
node sign_jwt.js
```

## Features Demonstration

### RAG Implementation
The application uses Vectorize to store Cloudflare Agents documentation embeddings. When a user asks a question:
1. The question is embedded using Workers AI
2. Top 3 most relevant documentation chunks are retrieved
3. Context is injected into the LLM prompt
4. Response is generated with accurate, source-based information

### Voice Input
Click the microphone button to use voice input. The Web Speech API converts speech to text, which is then sent to the chatbot.

### Cost Tracking
The application tracks AI token usage and provides estimated costs in the usage modal.

### Theme Support
Instant switching between light and dark modes with proper contrast ratios and accessibility.

## Re-indexing Documentation

To update the documentation embeddings:

1. Prepare your documentation chunks in docs-chunks.json
2. Format for upload:
```bash
cat docs-chunks.json | jq '{chunks: .}' > upload.json
```
3. Upload to Vectorize:
```bash
curl -X POST https://YOUR-WORKER.workers.dev/api/embed-docs \
  -H "Content-Type: application/json" \
  -d @upload.json
```

## Assignment Requirements Fulfilled

This project fulfills all requirements for the Cloudflare AI application assignment:

1. LLM Integration - Uses Llama 3.3 70B on Workers AI for intelligent responses
2. Workflow/Coordination - Implements Durable Objects for state management and coordination
3. User Input - Provides chat interface with voice input support via Web Speech API
4. Memory/State - Persists conversation history, user preferences, and analytics in Durable Objects

Additional enhancements:
- RAG with Vectorize for accurate documentation responses
- JWT authentication for security
- Cost tracking and analytics
- Modern UI with animations and accessibility
- Export and search functionality

## Performance

- Serverless architecture scales automatically
- Edge deployment for low latency worldwide
- Vectorize provides sub-100ms similarity search
- Durable Objects ensure consistent state

## Cost

- Vectorize: Free tier (10M queried dimensions/month)
- Workers AI: Pay-per-token pricing
- Workers: Free tier (100K requests/day)
- Durable Objects: Free tier (1M requests/month)

## Browser Support

- Modern browsers with ES6+ support
- Web Speech API for voice input (Chrome, Edge)
- Responsive design for all screen sizes

## Development Notes

- Modular code architecture for maintainability
- Separate files for frontend CSS and JavaScript
- Backend split into handler, auth, and utility modules
- CSS optimized with unused variables removed
- Custom favicon with Cloudflare orange gradient
- Industry-standard SVG icons
- Clean, production-ready code
- Comprehensive error handling with graceful fallbacks
- Storage limits with automatic cleanup to prevent overflow
- Input validation and type checking
- Proper CORS configuration
- JWT-based authentication
- Long-term stability measures for extended deployment
