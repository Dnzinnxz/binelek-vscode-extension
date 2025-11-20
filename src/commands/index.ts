import * as vscode from 'vscode';
import { BinelekMCPClient } from '../mcp/client.js';
import { TokenManager } from '../auth/tokenManager.js';
import { OntologyExplorerProvider } from '../views/ontologyExplorer.js';

export function registerCommands(
  context: vscode.ExtensionContext,
  mcpClient: BinelekMCPClient | undefined,
  tokenManager: TokenManager,
  ontologyProvider: OntologyExplorerProvider | undefined
) {
  // ========== Authentication ==========

  context.subscriptions.push(
    vscode.commands.registerCommand('binelek.authenticate', async () => {
      const success = await tokenManager.authenticate();
      if (success && mcpClient) {
        await mcpClient.reconnect();
        ontologyProvider?.refresh();
        vscode.window.showInformationMessage('✓ Connected to Binelek Platform');
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('binelek.disconnect', async () => {
      await tokenManager.clearToken();
      if (mcpClient) {
        await mcpClient.disconnect();
      }
      ontologyProvider?.refresh();
    })
  );

  // ========== Ontology Explorer ==========

  context.subscriptions.push(
    vscode.commands.registerCommand('binelek.refreshOntology', () => {
      ontologyProvider?.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('binelek.showEntityDetails', async (data: any) => {
      const panel = vscode.window.createWebviewPanel(
        'binelekEntityDetails',
        `Entity: ${data.entity.properties?.id || 'Unknown'}`,
        vscode.ViewColumn.One,
        { enableScripts: true }
      );

      panel.webview.html = getEntityDetailsHtml(data.entity);
    })
  );

  // ========== Cypher Query ==========

  context.subscriptions.push(
    vscode.commands.registerCommand('binelek.queryCypher', async () => {
      if (!mcpClient?.isConnected()) {
        vscode.window.showErrorMessage('Not connected to Binelek. Please authenticate first.');
        return;
      }

      const query = await vscode.window.showInputBox({
        prompt: 'Enter Cypher query',
        placeHolder: 'MATCH (n:Property) RETURN n LIMIT 10',
        ignoreFocusOut: true
      });

      if (!query) {
        return;
      }

      try {
        const results = await vscode.window.withProgress({
          location: vscode.ProgressLocation.Notification,
          title: 'Running Cypher query...',
          cancellable: false
        }, async () => {
          return await mcpClient.queryEntities(query);
        });

        // Show results in output channel
        const outputChannel = vscode.window.createOutputChannel('Binelek Query Results');
        outputChannel.clear();
        outputChannel.appendLine('=== Query Results ===');
        outputChannel.appendLine(JSON.stringify(results, null, 2));
        outputChannel.show();
      } catch (error: any) {
        vscode.window.showErrorMessage(`Query failed: ${error.message}`);
      }
    })
  );

  // ========== Search ==========

  context.subscriptions.push(
    vscode.commands.registerCommand('binelek.semanticSearch', async () => {
      if (!mcpClient?.isConnected()) {
        vscode.window.showErrorMessage('Not connected to Binelek. Please authenticate first.');
        return;
      }

      const query = await vscode.window.showInputBox({
        prompt: 'Enter search query',
        placeHolder: 'luxury waterfront properties',
        ignoreFocusOut: true
      });

      if (!query) {
        return;
      }

      try {
        const results = await vscode.window.withProgress({
          location: vscode.ProgressLocation.Notification,
          title: 'Searching...',
          cancellable: false
        }, async () => {
          return await mcpClient.semanticSearch(query);
        });

        showSearchResults('Semantic Search Results', query, results);
      } catch (error: any) {
        vscode.window.showErrorMessage(`Search failed: ${error.message}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('binelek.keywordSearch', async () => {
      if (!mcpClient?.isConnected()) {
        vscode.window.showErrorMessage('Not connected to Binelek. Please authenticate first.');
        return;
      }

      const query = await vscode.window.showInputBox({
        prompt: 'Enter keyword search',
        placeHolder: 'residential property',
        ignoreFocusOut: true
      });

      if (!query) {
        return;
      }

      try {
        const results = await vscode.window.withProgress({
          location: vscode.ProgressLocation.Notification,
          title: 'Searching...',
          cancellable: false
        }, async () => {
          return await mcpClient.keywordSearch(query);
        });

        showSearchResults('Keyword Search Results', query, results);
      } catch (error: any) {
        vscode.window.showErrorMessage(`Search failed: ${error.message}`);
      }
    })
  );

  // ========== Entity Creation ==========

  context.subscriptions.push(
    vscode.commands.registerCommand('binelek.createEntity', async () => {
      if (!mcpClient?.isConnected()) {
        vscode.window.showErrorMessage('Not connected to Binelek. Please authenticate first.');
        return;
      }

      const entityType = await vscode.window.showInputBox({
        prompt: 'Enter entity type',
        placeHolder: 'Property',
        ignoreFocusOut: true
      });

      if (!entityType) {
        return;
      }

      const attributesJson = await vscode.window.showInputBox({
        prompt: 'Enter entity attributes as JSON',
        placeHolder: '{"address": "123 Main St", "price": 500000}',
        ignoreFocusOut: true
      });

      if (!attributesJson) {
        return;
      }

      try {
        const attributes = JSON.parse(attributesJson);
        const result = await mcpClient.createEntity(entityType, attributes);
        vscode.window.showInformationMessage(`✓ Entity created: ${result.id}`);
        ontologyProvider?.refresh();
      } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to create entity: ${error.message}`);
      }
    })
  );

  // ========== YAML Validation ==========

  context.subscriptions.push(
    vscode.commands.registerCommand('binelek.validateYaml', async () => {
      if (!mcpClient?.isConnected()) {
        vscode.window.showErrorMessage('Not connected to Binelek. Please authenticate first.');
        return;
      }

      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== 'yaml') {
        vscode.window.showErrorMessage('Please open a YAML file first');
        return;
      }

      const yamlContent = editor.document.getText();

      try {
        const result = await vscode.window.withProgress({
          location: vscode.ProgressLocation.Notification,
          title: 'Validating YAML...',
          cancellable: false
        }, async () => {
          return await mcpClient.validateYaml(yamlContent);
        });

        vscode.window.showInformationMessage(result);
      } catch (error: any) {
        vscode.window.showErrorMessage(`Validation failed: ${error.message}`);
      }
    })
  );

  // ========== Code Generation ==========

  context.subscriptions.push(
    vscode.commands.registerCommand('binelek.generateCode', async () => {
      if (!mcpClient?.isConnected()) {
        vscode.window.showErrorMessage('Not connected to Binelek. Please authenticate first.');
        return;
      }

      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== 'yaml') {
        vscode.window.showErrorMessage('Please open an ontology YAML file first');
        return;
      }

      const language = await vscode.window.showQuickPick(
        ['csharp', 'typescript', 'python', 'cypher'],
        { placeHolder: 'Select target language' }
      );

      if (!language) {
        return;
      }

      const yamlContent = editor.document.getText();

      try {
        const result = await vscode.window.withProgress({
          location: vscode.ProgressLocation.Notification,
          title: 'Generating code...',
          cancellable: false
        }, async () => {
          return await mcpClient.generateCode(yamlContent, language);
        });

        // Show generated code in new editor
        const doc = await vscode.workspace.openTextDocument({
          content: result,
          language: language === 'csharp' ? 'csharp' : language
        });
        await vscode.window.showTextDocument(doc);
      } catch (error: any) {
        vscode.window.showErrorMessage(`Code generation failed: ${error.message}`);
      }
    })
  );

  // ========== Pipelines ==========

  context.subscriptions.push(
    vscode.commands.registerCommand('binelek.listPipelines', async () => {
      if (!mcpClient?.isConnected()) {
        vscode.window.showErrorMessage('Not connected to Binelek. Please authenticate first.');
        return;
      }

      try {
        const pipelines = await mcpClient.listPipelines();

        const outputChannel = vscode.window.createOutputChannel('Binelek Pipelines');
        outputChannel.clear();
        outputChannel.appendLine('=== Data Pipelines ===');
        outputChannel.appendLine(JSON.stringify(pipelines, null, 2));
        outputChannel.show();
      } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to list pipelines: ${error.message}`);
      }
    })
  );

  // ========== AI Chat ==========

  context.subscriptions.push(
    vscode.commands.registerCommand('binelek.aiChat', async () => {
      if (!mcpClient?.isConnected()) {
        vscode.window.showErrorMessage('Not connected to Binelek. Please authenticate first.');
        return;
      }

      const message = await vscode.window.showInputBox({
        prompt: 'Ask the Binelek AI a question',
        placeHolder: 'What are the most expensive properties in the system?',
        ignoreFocusOut: true
      });

      if (!message) {
        return;
      }

      try {
        const response = await vscode.window.withProgress({
          location: vscode.ProgressLocation.Notification,
          title: 'Asking AI...',
          cancellable: false
        }, async () => {
          return await mcpClient.aiChat(message);
        });

        vscode.window.showInformationMessage(response, { modal: true });
      } catch (error: any) {
        vscode.window.showErrorMessage(`AI chat failed: ${error.message}`);
      }
    })
  );
}

// Helper functions

function getEntityDetailsHtml(entity: any): string {
  const properties = JSON.stringify(entity.properties || {}, null, 2);

  return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Entity Details</title>
    <style>
      body {
        font-family: var(--vscode-font-family);
        padding: 20px;
      }
      h1 {
        color: var(--vscode-editor-foreground);
      }
      pre {
        background: var(--vscode-editor-background);
        padding: 10px;
        border-radius: 4px;
        overflow-x: auto;
      }
    </style>
  </head>
  <body>
    <h1>Entity Details</h1>
    <h2>Type: ${entity.labels?.join(', ') || 'Unknown'}</h2>
    <h3>Properties:</h3>
    <pre>${properties}</pre>
  </body>
  </html>`;
}

function showSearchResults(title: string, query: string, results: any): void {
  const outputChannel = vscode.window.createOutputChannel(title);
  outputChannel.clear();
  outputChannel.appendLine(`=== ${title} ===`);
  outputChannel.appendLine(`Query: ${query}`);
  outputChannel.appendLine('');
  outputChannel.appendLine(JSON.stringify(results, null, 2));
  outputChannel.show();
}
