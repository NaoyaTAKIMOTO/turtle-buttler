# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

問題について原因を調査して説明して。
また実装計画について全体像を説明して。
ユーザーに理解を得てから実装に進んで。
テストを通してからコミットして。
timeoutはテスト失敗扱い。
コミットする時にREADMEに反映する。
make コマンドを利用して。

## Development Commands

### Build & Run
```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start application
npm start

# Run tests
npm test
```

### Docker
```bash
# Build Docker image
docker build -t kame-buttler .

# Run container
docker run -d -p 8080:8080 --env-file .env kame-buttler

# E2E test
docker rm -f turtle-buttler || docker build -t turtle-butter . || true && docker run -d --name turtle-buttler -p 8080:8080 --env-file .env -e NODE_ENV=test turtle-buttler && sleep 2 && curl -s -X POST http://localhost:8080/ -H "Content-Type: application/json" --data @dummy_line_request.json && echo "\n--- LOGS ---" && docker logs turtle-buttler
```

### GCP Deployment
```bash
# Setup GCP secrets and permissions
make setup

# Deploy main application
make deploy

# Deploy MCP services
make deploy-mcp

# Deploy everything
make deploy-all
```

## Architecture Overview

This is a LINE bot application built with TypeScript/Node.js that integrates multiple AI services and external APIs.

### Core Components

- **Main Application** (`kame_buttler.ts`): Express server handling LINE webhook requests
- **User Profile Service** (`user-profile-service/`): Standalone service for user data management
- **MCP Servers** (`mcp-servers/`): Microservices for external API integrations
  - `rakuten-server/`: Rakuten product search API wrapper

### Key Integrations

- **LINE Messaging API**: Primary chat interface
- **Firebase Realtime Database**: User data persistence
- **Google Sheets API**: Message logging
- **LLM Services**: 
  - Cohere Command-R-Plus API for natural language responses
  - Google Gemini API for advanced reasoning and tool calling
- **External APIs**: Rakuten product search (previously Amazon)

### Data Flow

1. LINE webhook → Express server (`kame_buttler.ts`)
2. User info retrieval → User Profile Service or Firebase
3. Message processing → LLM services (Cohere/Gemini)
4. Tool calls → MCP servers (Rakuten API, etc.)
5. Response generation → LINE Messaging API
6. Logging → Google Sheets

### Environment Setup

The application requires extensive environment variables for API keys and credentials. Use `.env` file with Base64-encoded JSON credentials for Firebase and Google APIs.

Critical environment variables:
- `CREDENTIALS_ADMIN`: Firebase Admin SDK (Base64)
- `CHANNEL_ACCESS`/`CHANNEL_SECRET`: LINE API credentials
- `CO_API_KEY`: Cohere API key
- `GEMINI_API_KEY`: Google Gemini API key
- `RAKUTEN_APPLICATION_ID`/`RAKUTEN_AFFILIATE_ID`: Rakuten API credentials

### Testing

- Uses Mocha + Chai + ts-node for unit testing
- Test environment uses in-memory stores instead of external services
- E2E testing via Docker with curl requests to webhook endpoint

### Deployment

- GCP Cloud Run for containerized deployment
- Cloud Build for CI/CD pipeline
- Secret Manager for credential management
- Automated deployment scripts handle GCP setup and service deployment

### TODO
- [x] promptがおかしい。ユーザーの発話に対する返信だけでなく、過去の発言に対する返事もしてしまう。
- [x] デプロイできるように修正