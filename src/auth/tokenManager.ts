import * as vscode from 'vscode';
import axios from 'axios';

export class TokenManager {
  private static readonly TOKEN_KEY = 'binelek.jwt.token';
  private static readonly TENANT_KEY = 'binelek.tenant.id';
  private static readonly USER_EMAIL_KEY = 'binelek.user.email';

  constructor(private context: vscode.ExtensionContext) {}

  async authenticate(): Promise<boolean> {
    const config = vscode.workspace.getConfiguration('binelek');
    const gatewayUrl = config.get<string>('gatewayUrl');

    if (!gatewayUrl) {
      vscode.window.showErrorMessage('Binelek Gateway URL not configured');
      return false;
    }

    // Prompt for credentials
    const email = await vscode.window.showInputBox({
      prompt: 'Enter your Binelek email',
      placeHolder: 'user@example.com',
      ignoreFocusOut: true
    });

    if (!email) {
      return false;
    }

    const password = await vscode.window.showInputBox({
      prompt: 'Enter your password',
      password: true,
      ignoreFocusOut: true
    });

    if (!password) {
      return false;
    }

    try {
      // Show progress
      return await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Authenticating with Binelek Platform...',
        cancellable: false
      }, async () => {
        // Call API Gateway auth endpoint
        const response = await axios.post(`${gatewayUrl}/api/auth/login`, {
          email,
          password
        });

        const { token, tenantId } = response.data;

        // Store credentials securely
        await this.context.secrets.store(TokenManager.TOKEN_KEY, token);
        await this.context.globalState.update(TokenManager.TENANT_KEY, tenantId);
        await this.context.globalState.update(TokenManager.USER_EMAIL_KEY, email);

        vscode.window.showInformationMessage(`✓ Successfully authenticated as ${email}`);
        return true;
      });
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      vscode.window.showErrorMessage(`Authentication failed: ${message}`);
      return false;
    }
  }

  async getToken(): Promise<string | undefined> {
    return await this.context.secrets.get(TokenManager.TOKEN_KEY);
  }

  async getTenantId(): Promise<string> {
    return this.context.globalState.get<string>(TokenManager.TENANT_KEY) || 'core';
  }

  async getUserEmail(): Promise<string | undefined> {
    return this.context.globalState.get<string>(TokenManager.USER_EMAIL_KEY);
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  }

  async clearToken(): Promise<void> {
    await this.context.secrets.delete(TokenManager.TOKEN_KEY);
    await this.context.globalState.update(TokenManager.TENANT_KEY, undefined);
    await this.context.globalState.update(TokenManager.USER_EMAIL_KEY, undefined);
    vscode.window.showInformationMessage('✓ Logged out from Binelek Platform');
  }

  async refreshToken(): Promise<boolean> {
    const config = vscode.workspace.getConfiguration('binelek');
    const gatewayUrl = config.get<string>('gatewayUrl');
    const currentToken = await this.getToken();

    if (!gatewayUrl || !currentToken) {
      return false;
    }

    try {
      const response = await axios.post(`${gatewayUrl}/api/auth/refresh`, {}, {
        headers: { 'Authorization': `Bearer ${currentToken}` }
      });

      const { token } = response.data;
      await this.context.secrets.store(TokenManager.TOKEN_KEY, token);
      return true;
    } catch (error) {
      // Token refresh failed - user needs to re-authenticate
      return false;
    }
  }
}
