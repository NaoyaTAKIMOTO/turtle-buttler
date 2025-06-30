# Turtle Butler (カメ執事) 🐢

AI-powered LINE Bot that acts as a polite Kansai-dialect butler, providing personalized conversations and product recommendations.

## Features

- **Conversational AI**: Powered by Google Gemini for natural conversations
- **Character-based Responses**: Polite Kansai-dialect butler personality  
- **User Profile Management**: Remembers user preferences and conversation history
- **Product Search**: Rakuten API integration for product recommendations
- **Firebase Integration**: Real-time database for user data persistence
- **MCP Architecture**: Modular Component Protocol for service communication

## Architecture

```
├── src/
│   ├── kame_buttler.ts          # Main application logic
│   ├── prompts.ts               # AI prompts and character settings
│   ├── env.d.ts                 # Environment variable types
│   └── tests/
│       ├── unit.test.ts         # Pure function tests
│       ├── mocked-integration.test.ts # Integration tests with mocks
│       └── e2e.test.ts          # End-to-end tests with real APIs
└── apps/
    ├── user-profile-service/    # User data management service
    └── rakuten-server/          # Product search service
```

## Testing Strategy

The project uses a three-tier testing approach:

### 1. Unit Tests (`npm run test:unit`)
- Pure function testing
- Business logic validation
- Fast execution (< 1 second)
- No external dependencies

### 2. Integration Tests (`npm run test:integration`)  
- Component interaction testing
- Mocked external APIs
- Medium execution time (< 10 seconds)
- Validates data flow and error handling

### 3. E2E Tests (`npm run test:e2e`)
- Real API integration testing
- Requires environment variables
- Slower execution (< 30 seconds)
- Skips automatically if APIs unavailable

## Setup

### Environment Variables

Create a `.env` file with:

```bash
# Required for basic functionality
GEMINI_API_KEY=your_gemini_api_key
CHANNEL_ACCESS=your_line_channel_access_token
CHANNEL_SECRET=your_line_channel_secret

# Required for Firebase (base64 encoded)
FIREBASE_URL=https://your-project.firebaseio.com
CREDENTIALS_ADMIN=base64_encoded_firebase_admin_key

# Optional for MCP services
USER_PROFILE_SERVICE_URL=http://localhost:8080
RAKUTEN_SERVER_URL=http://localhost:8081
```

### Installation

1. **Install mise** (if not already installed):
```bash
# macOS
brew install mise

# Ubuntu/Debian
curl https://mise.run | sh

# Other systems: https://mise.jdx.dev/getting-started.html
```

2. **Install Node.js using mise**:
```bash
mise install
```

3. **Install dependencies and build**:
```bash
npm install
npm run build
```

### Running Tests

```bash
# All tests
npm test

# Individual test suites
npm run test:unit         # Fast unit tests
npm run test:integration  # Mocked integration tests  
npm run test:e2e         # Real API tests (requires credentials)

# All services
npm run test:all
```

### Development

```bash
# Start main service
npm start

# Build all services
npm run build:apps
```

## API Integration

### Google Gemini
- **Purpose**: Natural language processing and response generation
- **Fallback**: Graceful degradation with simple responses
- **Rate Limiting**: Handled automatically

### Firebase Realtime Database
- **Purpose**: User profile and conversation history storage
- **Fallback**: In-memory storage for testing
- **Authentication**: Service account key

### Rakuten API
- **Purpose**: Product search and recommendations
- **Integration**: Via MCP server architecture
- **Fallback**: Mock data in test environment

## Character Design

The Kame Butler is designed as:
- **Personality**: Calm, thoughtful, experienced butler
- **Speech**: Polite Kansai dialect (refined Osaka/Kyoto style)
- **Behavior**: Patient, helpful, never rushes the user
- **Goal**: Provide relaxation and gentle guidance

## Error Handling

- **Network Failures**: Automatic retry with exponential backoff
- **API Errors**: Graceful fallback to default responses
- **Data Corruption**: Validation and sanitization
- **Rate Limiting**: Respectful API usage patterns

## Security

- **API Keys**: Environment variable storage only
- **User Data**: Encrypted transmission and storage
- **Input Validation**: All user inputs sanitized
- **Error Messages**: No sensitive information exposed

## Performance

- **Response Time**: < 2 seconds for typical interactions
- **Concurrent Users**: Supports 100+ simultaneous conversations
- **Memory Usage**: Optimized for cloud deployment
- **Database**: Efficient queries with minimal reads/writes

## Deployment

The application is designed for cloud deployment:

- **Container Ready**: Dockerfile provided
- **Environment Flexible**: Works in various cloud environments
- **Scaling**: Horizontal scaling supported
- **Monitoring**: Comprehensive logging and error tracking

### Development Commands

```bash
# Build and run
mise run install                   # Install dependencies
mise run build                     # Build main application
mise run build-all                 # Build all applications
mise run start                     # Start application

# Testing
mise run test                      # Run all tests
mise run test-unit                 # Run unit tests only
mise run test-integration          # Run integration tests
mise run test-e2e                  # Run e2e tests
mise run test-all                  # Run all test suites

# Deployment
mise run setup                     # Setup GCP secrets
mise run deploy                    # Deploy main application
mise run deploy-mcp                # Deploy MCP services
mise run deploy-all                # Deploy everything

# Database rules
mise run deploy-db-rules           # Deploy default rules
mise run deploy-db-rules-prod      # Deploy production rules
mise run deploy-db-rules-secure    # Deploy high-security rules
```

## Contributing

1. Follow the established testing patterns
2. Maintain character consistency in responses
3. Add tests for new features
4. Update documentation for API changes

## License

ISC License - See LICENSE file for details.