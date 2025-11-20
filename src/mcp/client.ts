import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import * as vscode from 'vscode';
import { TokenManager } from '../auth/tokenManager.js';

export class BinelekMCPClient {
  private client?: Client;
  private transport?: StdioClientTransport;
  private connected: boolean = false;

  constructor(
    private serverPath: string,
    private tokenManager: TokenManager,
    private context: vscode.ExtensionContext
  ) {}

  async connect(): Promise<void> {
    if (this.connected) {
      console.log('MCP client already connected');
      return;
    }

    const token = await this.tokenManager.getToken();
    const tenantId = await this.tokenManager.getTenantId();
    const config = vscode.workspace.getConfiguration('binelek');
    const gatewayUrl = config.get<string>('gatewayUrl');

    // Parse server path (handle "node /path/to/script.js" format)
    const pathParts = this.serverPath.split(' ');
    const command = pathParts[0];
    const args = pathParts.slice(1);

    try {
      this.transport = new StdioClientTransport({
        command,
        args,
        env: {
          ...process.env,
          BINELEK_GATEWAY_URL: gatewayUrl,
          BINELEK_JWT_TOKEN: token || '',
          BINELEK_TENANT_ID: tenantId
        }
      });

      this.client = new Client({
        name: 'binelek-vscode-extension',
        version: '1.0.0'
      }, {
        capabilities: {}
      });

      await this.client.connect(this.transport);
      this.connected = true;
      console.log('✓ MCP client connected');
    } catch (error: any) {
      console.error('Failed to connect MCP client:', error);
      throw new Error(`MCP connection failed: ${error.message}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.connected = false;
      console.log('MCP client disconnected');
    }
  }

  async reconnect(): Promise<void> {
    await this.disconnect();
    await this.connect();
  }

  isConnected(): boolean {
    return this.connected;
  }

  private async ensureConnected(): Promise<void> {
    if (!this.connected) {
      throw new Error('MCP client not connected. Please authenticate first.');
    }
  }

  // ========== Ontology Tools ==========

  async getEntity(entityId: string): Promise<any> {
    await this.ensureConnected();
    const result = await this.client!.callTool({
      name: 'binelek_get_entity',
      arguments: { entityId }
    });
    return JSON.parse(result.content[0].text);
  }

  async queryEntities(cypherQuery: string, parameters?: Record<string, any>): Promise<any> {
    await this.ensureConnected();
    const result = await this.client!.callTool({
      name: 'binelek_query_entities',
      arguments: { cypherQuery, parameters }
    });
    return JSON.parse(result.content[0].text);
  }

  async createEntity(entityType: string, attributes: Record<string, any>): Promise<any> {
    await this.ensureConnected();
    const result = await this.client!.callTool({
      name: 'binelek_create_entity',
      arguments: { entityType, attributes }
    });
    return JSON.parse(result.content[0].text);
  }

  async updateEntity(entityId: string, attributes: Record<string, any>): Promise<any> {
    await this.ensureConnected();
    const result = await this.client!.callTool({
      name: 'binelek_update_entity',
      arguments: { entityId, attributes }
    });
    return JSON.parse(result.content[0].text);
  }

  async getRelationships(entityId: string): Promise<any> {
    await this.ensureConnected();
    const result = await this.client!.callTool({
      name: 'binelek_get_relationships',
      arguments: { entityId }
    });
    return JSON.parse(result.content[0].text);
  }

  // ========== Search Tools ==========

  async semanticSearch(query: string, entityTypes?: string[], limit = 10): Promise<any> {
    await this.ensureConnected();
    const result = await this.client!.callTool({
      name: 'binelek_semantic_search',
      arguments: { query, entityTypes, limit }
    });
    return JSON.parse(result.content[0].text);
  }

  async keywordSearch(query: string, filters?: Record<string, any>, limit = 10): Promise<any> {
    await this.ensureConnected();
    const result = await this.client!.callTool({
      name: 'binelek_keyword_search',
      arguments: { query, filters, limit }
    });
    return JSON.parse(result.content[0].text);
  }

  // ========== AI Tools ==========

  async aiChat(message: string, context?: any[]): Promise<any> {
    await this.ensureConnected();
    const result = await this.client!.callTool({
      name: 'binelek_ai_chat',
      arguments: { message, context }
    });
    return result.content[0].text;
  }

  async aiPredict(modelType: string, input: Record<string, any>): Promise<any> {
    await this.ensureConnected();
    const result = await this.client!.callTool({
      name: 'binelek_ai_predict',
      arguments: { modelType, input }
    });
    return JSON.parse(result.content[0].text);
  }

  // ========== Pipeline Tools ==========

  async listPipelines(): Promise<any> {
    await this.ensureConnected();
    const result = await this.client!.callTool({
      name: 'binelek_list_pipelines',
      arguments: {}
    });
    return JSON.parse(result.content[0].text);
  }

  async triggerPipeline(pipelineId: string, parameters?: Record<string, any>): Promise<any> {
    await this.ensureConnected();
    const result = await this.client!.callTool({
      name: 'binelek_trigger_pipeline',
      arguments: { pipelineId, parameters }
    });
    return JSON.parse(result.content[0].text);
  }

  // ========== Admin Tools ==========

  async listDomains(): Promise<any> {
    await this.ensureConnected();
    const result = await this.client!.callTool({
      name: 'binelek_list_domains',
      arguments: {}
    });
    return JSON.parse(result.content[0].text);
  }

  async getOntologySchema(domainName: string): Promise<any> {
    await this.ensureConnected();
    const result = await this.client!.callTool({
      name: 'binelek_get_ontology_schema',
      arguments: { domainName }
    });
    return JSON.parse(result.content[0].text);
  }

  async validateYaml(yamlContent: string): Promise<any> {
    await this.ensureConnected();
    const result = await this.client!.callTool({
      name: 'binelek_validate_yaml',
      arguments: { yamlContent }
    });
    return result.content[0].text;
  }

  async generateCode(yamlContent: string, targetLanguage: string): Promise<any> {
    await this.ensureConnected();
    const result = await this.client!.callTool({
      name: 'binelek_generate_code',
      arguments: { yamlContent, targetLanguage }
    });
    return result.content[0].text;
  }
}
