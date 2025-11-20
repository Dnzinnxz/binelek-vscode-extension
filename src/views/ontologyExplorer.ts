import * as vscode from 'vscode';
import { BinelekMCPClient } from '../mcp/client.js';

export class OntologyExplorerProvider implements vscode.TreeDataProvider<OntologyItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<OntologyItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(
    private mcpClient: BinelekMCPClient | undefined,
    private context: vscode.ExtensionContext
  ) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: OntologyItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: OntologyItem): Promise<OntologyItem[]> {
    if (!this.mcpClient?.isConnected()) {
      return [];
    }

    try {
      if (!element) {
        // Root level: Entity Types
        const query = 'MATCH (n) RETURN DISTINCT labels(n) as labels LIMIT 50';
        const results = await this.mcpClient.queryEntities(query);

        const entityTypes = new Set<string>();
        results.forEach((record: any) => {
          if (record.labels && Array.isArray(record.labels)) {
            record.labels.forEach((label: string) => entityTypes.add(label));
          }
        });

        return Array.from(entityTypes)
          .sort()
          .map(type =>
            new OntologyItem(
              type,
              type,
              vscode.TreeItemCollapsibleState.Collapsed,
              'entityType',
              { type }
            )
          );
      } else if (element.contextValue === 'entityType') {
        // Second level: Entities of this type
        const entityType = element.data.type;
        const query = `MATCH (n:${entityType}) RETURN n LIMIT 20`;
        const results = await this.mcpClient.queryEntities(query);

        return results.map((record: any) => {
          const entity = record.n;
          const id = entity.properties?.id || 'unknown';
          const name = entity.properties?.name || entity.properties?.address || id;

          return new OntologyItem(
            name,
            `${entityType}: ${name}`,
            vscode.TreeItemCollapsibleState.None,
            'entity',
            { entity, entityType }
          );
        });
      }

      return [];
    } catch (error: any) {
      vscode.window.showErrorMessage(`Failed to load ontology: ${error.message}`);
      return [];
    }
  }
}

export class OntologyItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly tooltip: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly contextValue: string,
    public readonly data: any
  ) {
    super(label, collapsibleState);

    this.tooltip = tooltip;
    this.contextValue = contextValue;

    // Set icons
    if (contextValue === 'entityType') {
      this.iconPath = new vscode.ThemeIcon('symbol-class');
    } else if (contextValue === 'entity') {
      this.iconPath = new vscode.ThemeIcon('symbol-object');
      this.command = {
        command: 'binelek.showEntityDetails',
        title: 'Show Entity Details',
        arguments: [data]
      };
    }
  }
}
