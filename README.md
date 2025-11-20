# Binelek Platform VS Code Extension

Official VS Code extension for the Binelek Platform. Provides integrated development tools for working with Binelek knowledge graphs, ontologies, and AI services.

## Features

- **Ontology Explorer** - Browse and explore your knowledge graph entities in the VS Code sidebar
- **Cypher Query Runner** - Execute Cypher queries directly from VS Code
- **Semantic Search** - Search entities using natural language
- **Entity Management** - Create, update, and view entity details
- **YAML Validation** - Validate ontology YAML files against Binelek schema
- **Code Generation** - Generate code from ontology YAML (C#, TypeScript, Python, Cypher)
- **AI Chat** - Chat with Binelek AI assistant
- **Pipeline Management** - View and trigger data pipelines

## Installation

### Prerequisites

1. **Binelek Platform** must be running:
   ```bash
   docker-compose up -d  # Start Binelek services
   ```

2. **Binelek MCP Server** must be installed:
   ```bash
   cd /path/to/binelek-mcp-server
   npm install
   npm run build
   ```

### Install Extension

#### From VSIX (Recommended)

```bash
# Package the extension
cd /path/to/binelek-vscode-extension
npm install
npm run compile
npm run package

# Install in VS Code
code --install-extension binelek-platform-1.0.0.vsix
```

#### From Source (Development)

1. Open this directory in VS Code
2. Press `F5` to launch Extension Development Host
3. The extension will be active in the new window

## Configuration

Open VS Code Settings and configure:

```json
{
  "binelek.gatewayUrl": "http://localhost:8092",
  "binelek.tenantId": "core",
  "binelek.mcpServerPath": "node /path/to/binelek-mcp-server/build/index.js",
  "binelek.autoConnect": true
}
```

### Configuration Options

| Setting | Description | Default |
|---------|-------------|---------|
| `binelek.gatewayUrl` | Binelek API Gateway URL | `http://localhost:8092` |
| `binelek.tenantId` | Default tenant ID | `core` |
| `binelek.mcpServerPath` | Path to MCP server | (required) |
| `binelek.autoConnect` | Auto-connect on startup | `true` |

## Usage

### 1. Authenticate

1. Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Run **"Binelek: Authenticate"**
3. Enter your email and password
4. ✓ Connected!

### 2. Explore Ontology

- Open **Binelek Ontology** view in Explorer sidebar
- Browse entity types
- Click on entities to view details
- Click refresh icon to reload

### 3. Run Cypher Queries

**Command:** `Binelek: Run Cypher Query` (`Cmd+Shift+C`)

```cypher
MATCH (p:Property)
WHERE p.price > 500000
RETURN p
LIMIT 10
```

Results appear in the Output panel.

### 4. Search Entities

**Semantic Search** (`Cmd+Shift+S`):
```
luxury waterfront properties with modern amenities
```

**Keyword Search**:
```
residential property
```

### 5. Create Entities

**Command:** `Binelek: Create Entity`

1. Enter entity type: `Property`
2. Enter attributes as JSON:
   ```json
   {
     "address": "123 Main St",
     "price": 500000,
     "sqft": 2500
   }
   ```

### 6. Validate & Generate Code

Open an ontology YAML file, then:

- **Validate:** `Binelek: Validate Ontology YAML`
- **Generate:** `Binelek: Generate Code from YAML`
  - Select target language (C#, TypeScript, Python, Cypher)
  - Generated code opens in new editor

### 7. AI Chat

**Command:** `Binelek: Chat with AI`

Ask questions about your data:
- "What are the most expensive properties?"
- "Show me properties with solar panels"
- "Analyze property trends in San Francisco"

## Commands Reference

| Command | Keybinding | Description |
|---------|-----------|-------------|
| `Binelek: Authenticate` | - | Log in to Binelek Platform |
| `Binelek: Disconnect` | - | Log out |
| `Binelek: Refresh Ontology Explorer` | - | Reload ontology tree |
| `Binelek: Run Cypher Query` | `Cmd+Shift+C` | Execute Cypher query |
| `Binelek: Semantic Search` | `Cmd+Shift+S` | Search with natural language |
| `Binelek: Keyword Search` | - | Search with keywords |
| `Binelek: Create Entity` | - | Create new entity |
| `Binelek: Validate Ontology YAML` | - | Validate YAML file |
| `Binelek: Generate Code from YAML` | - | Generate code |
| `Binelek: List Data Pipelines` | - | Show all pipelines |
| `Binelek: Chat with AI` | - | Chat with AI assistant |

## Architecture

```
VS Code Extension
  ↓ stdio
MCP Server (binelek-mcp-server)
  ↓ HTTP/REST
API Gateway (localhost:8092)
  ↓ routes to
Backend Services (Ontology, Search, AI, etc.)
```

The extension communicates with backend services through:
1. **MCP Server** - Provides tool-based interface via stdio
2. **API Gateway** - Handles authentication, tenant isolation, rate limiting

## Development

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode (auto-compile)
npm run watch

# Run tests
npm test

# Package extension
npm run package
```

## Troubleshooting

### "Not connected to Binelek"

1. Check API Gateway is running: `curl http://localhost:8092/health`
2. Check MCP server path in settings
3. Try authenticating again

### "MCP connection failed"

1. Verify MCP server is built: `cd binelek-mcp-server && npm run build`
2. Check server path format: `node /full/path/to/build/index.js`
3. Check logs in Output panel (select "Binelek" channel)

### "Authentication failed"

1. Verify credentials
2. Check API Gateway logs: `docker-compose logs binah-api`
3. Try accessing Gateway directly: `curl http://localhost:8092/api/auth/login`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT

## Support

- **Documentation:** https://docs.binelek.com
- **Issues:** https://github.com/k5tuck/binelek-vscode-extension/issues
- **Email:** support@binelek.com
