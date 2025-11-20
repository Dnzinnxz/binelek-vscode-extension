import * as vscode from 'vscode';
import { OntologyExplorerProvider } from './views/ontologyExplorer.js';
import { TokenManager } from './auth/tokenManager.js';
import { BinelekMCPClient } from './mcp/client.js';
import { registerCommands } from './commands/index.js';

let mcpClient: BinelekMCPClient | undefined;
let ontologyProvider: OntologyExplorerProvider | undefined;

export async function activate(context: vscode.ExtensionContext) {
  console.log('Binelek Platform extension is now active');

  // Initialize token manager
  const tokenManager = new TokenManager(context);

  // Get configuration
  const config = vscode.workspace.getConfiguration('binelek');
  const mcpServerPath = config.get<string>('mcpServerPath');
  const autoConnect = config.get<boolean>('autoConnect', true);

  // Initialize MCP client if path is configured
  if (mcpServerPath) {
    mcpClient = new BinelekMCPClient(mcpServerPath, tokenManager, context);

    if (autoConnect) {
      try {
        await mcpClient.connect();
        vscode.window.showInformationMessage('✓ Connected to Binelek Platform');
      } catch (error: any) {
        vscode.window.showWarningMessage(`Failed to connect to Binelek: ${error.message}`);
      }
    }
  } else {
    vscode.window.showWarningMessage(
      'Binelek MCP Server path not configured. Please set "binelek.mcpServerPath" in settings.'
    );
  }

  // Register ontology explorer tree view
  ontologyProvider = new OntologyExplorerProvider(mcpClient, context);
  vscode.window.registerTreeDataProvider('binelekOntologyExplorer', ontologyProvider);

  // Register all commands
  registerCommands(context, mcpClient, tokenManager, ontologyProvider);

  // Listen for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async (e) => {
      if (e.affectsConfiguration('binelek')) {
        const response = await vscode.window.showInformationMessage(
          'Binelek configuration changed. Reload window to apply?',
          'Reload',
          'Later'
        );
        if (response === 'Reload') {
          vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
      }
    })
  );

  // Status bar item
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = '$(database) Binelek';
  statusBarItem.tooltip = 'Binelek Platform';
  statusBarItem.command = 'binelek.authenticate';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  console.log('✓ Binelek extension activated successfully');
}

export function deactivate() {
  if (mcpClient) {
    mcpClient.disconnect();
  }
  console.log('Binelek extension deactivated');
}
