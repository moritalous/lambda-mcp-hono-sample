# OAuth Authorization MCP Server

AWS Lambda上で動作するOAuth認証機能付きMCP（Model Context Protocol）サーバーのサンプル実装です。

## 概要

このプロジェクトは、OAuth 2.1仕様に基づく認証機能を持つMCPサーバーの実装例を提供します。HonoフレームワークとMCP TypeScript SDKを使用し、セキュアなMCPサーバーをAWS Lambda上で構築する方法を示しています。

## 特徴

- **OAuth 2.1認証**: 標準的なOAuth認証フローを実装
- **AWS Lambda対応**: サーバーレス環境での動作に最適化
- **Honoフレームワーク**: 軽量で高速なWebフレームワークを使用
- **Streamable HTTP**: MCPのStreamable HTTP仕様をステートレスで実装
- **TypeScript**: 型安全性を確保した開発
- **認証ミドルウェア**: リクエストの認証処理を自動化
- **メタデータエンドポイント**: OAuth設定情報の提供
- **動的クライアント登録**: OAuth クライアントの動的登録をサポート

## 技術スタック

- **MCP TypeScript SDK**: Model Context Protocolの公式TypeScript実装
- **Hono**: Web Standards準拠の軽量Webフレームワーク
- **fetch-to-node**: MCPのTypeScript SDKとHonoの互換性のためのアダプター
- **AWS Lambda**: サーバーレス実行環境
- **AWS SAM**: サーバーレスアプリケーションの構築・デプロイツール
- **OAuth 2.1**: 認証・認可プロトコル

## プロジェクト構成

```
oauth-authorization/
├── hello-world/              # Lambda関数のTypeScriptコード
│   ├── app.ts               # メインアプリケーションファイル
│   ├── middleware/          # 認証ミドルウェア
│   │   └── auth.ts         # OAuth認証処理
│   ├── routes/             # ルートハンドラー
│   │   ├── metadata.ts     # OAuth メタデータエンドポイント
│   │   ├── oauth.ts        # OAuth認証エンドポイント
│   │   └── registration.ts # クライアント登録エンドポイント
│   ├── package.json        # 依存関係の定義
│   └── tests/              # ユニットテスト
├── events/                 # 関数呼び出し用のテストイベント
├── template.yaml           # AWSリソース定義（SAMテンプレート）
└── samconfig.toml          # SAM設定ファイル
```

## MCPツール

このサーバーは以下のツールを提供します：

### calculate-bmi
BMI（Body Mass Index）を計算するツールです。

**入力パラメータ:**
- `weightKg` (number): 体重（キログラム）
- `heightM` (number): 身長（メートル）

**出力:**
- 計算されたBMI値（数値）

**注意**: このツールにアクセスするには有効なOAuthアクセストークンが必要です。

## OAuth認証フロー

このサーバーは以下のOAuth 2.1エンドポイントを提供します：

### 1. メタデータエンドポイント (`/.well-known/oauth-authorization-server`)
OAuth認証サーバーの設定情報を提供します。

### 2. 保護されたリソースメタデータエンドポイント (`/.well-known/oauth-protected-resource`)
保護されたリソースの情報を提供します。

### 3. クライアント登録エンドポイント (`/register`)
OAuth クライアントの動的登録を行います。

### 4. 認証エンドポイント (`/oauth2/authorize`)
OAuth認証フローの開始点です。

### 5. コールバックエンドポイント (`/oauth2/callback`)
OAuth認証のコールバック処理を行います。

### 6. トークンエンドポイント (`/oauth2/token`)
アクセストークンの取得・更新を行います。

## OAuth 2.1 認証フローシーケンス図

以下は、MCP クライアントとサーバー間のOAuth 2.1認証フローの詳細なシーケンス図です：

### Phase 1: 初回MCPリクエスト（未認証）

```mermaid
sequenceDiagram
    participant MC as MCP Client
    participant AG as API Gateway
    participant L as Lambda

    Note over MC,L: Phase 1: Initial MCP Request (Unauthenticated)
    MC->>AG: POST /mcp (no Authorization header)
    AG->>L: Forward request
    L->>L: authenticateRequest() - no token found
    L->>AG: 401 Unauthorized + WWW-Authenticate header
    AG->>MC: 401 Unauthorized + WWW-Authenticate header
    Note right of MC: WWW-Authenticate points to<br/>/.well-known/oauth-protected-resource
```

### Phase 2: メタデータ発見

```mermaid
sequenceDiagram
    participant MC as MCP Client
    participant AG as API Gateway
    participant L as Lambda

    Note over MC,L: Phase 2: Metadata Discovery
    MC->>AG: GET /.well-known/oauth-protected-resource
    AG->>L: Forward request
    L->>L: createProtectedResourceMetadata()
    L->>AG: 200 OK + Protected Resource Metadata
    AG->>MC: 200 OK + Protected Resource Metadata
    Note right of MC: Gets authorization_servers info

    MC->>AG: GET /.well-known/oauth-authorization-server
    AG->>L: Forward request
    L->>L: createAuthorizationServerMetadata()
    L->>AG: 200 OK + Authorization Server Metadata
    AG->>MC: 200 OK + Authorization Server Metadata
    Note right of MC: Gets endpoints: /register, /oauth2/authorize, /oauth2/token
```

### Phase 3: 動的クライアント登録

```mermaid
sequenceDiagram
    participant MC as MCP Client
    participant AG as API Gateway
    participant L as Lambda

    Note over MC,L: Phase 3: Dynamic Client Registration (Cognito Integration)
    MC->>AG: POST /register (client metadata)
    AG->>L: Forward request
    L->>L: Validate request (RFC 7591)
    L->>L: Return Cognito client credentials
    L->>AG: 201 Created + Cognito client credentials
    AG->>MC: 201 Created + Cognito client credentials
    Note right of MC: Gets Cognito client_id:<br/>COGNITO_USER_POOL_CLIENT_ID<br/>client_secret: "not_required"
```

### Phase 4: 認証フロー開始

```mermaid
sequenceDiagram
    participant MC as MCP Client
    participant B as Browser
    participant AG as API Gateway
    participant L as Lambda

    Note over MC,L: Phase 4: Authorization Flow Start
    MC->>MC: Generate PKCE parameters (code_verifier, code_challenge)
    MC->>MC: Build authorization URL with client_id, redirect_uri, etc.
    MC->>B: Open authorization URL in browser
    B->>AG: GET /oauth2/authorize?response_type=code&client_id=...&redirect_uri=...&code_challenge=...&resource=...
    AG->>L: Forward request
    L->>L: Validate authorization request (PKCE + Resource)
    L->>L: Use Cognito client_id for OAuth flow
    L->>L: Encode state with original redirect_uri
    L->>AG: 302 Redirect to Cognito
    AG->>B: 302 Redirect to Cognito
    Note right of B: Browser redirected to Cognito authorization endpoint<br/>with encoded state containing original redirect_uri
```

### Phase 5: Cognito認証

```mermaid
sequenceDiagram
    participant MC as MCP Client
    participant B as Browser
    participant C as Cognito

    Note over MC,C: Phase 5: Cognito Authentication
    B->>C: GET /oauth2/authorize (Cognito domain)
    C->>B: 302 Redirect to login page
    B->>C: GET /login (display login form)
    C->>B: 200 OK + Cognito Hosted UI login form
    Note over B,C: User enters email/password<br/>in browser
    B->>C: POST /login (user credentials + CSRF token)
    C->>C: Authenticate user credentials
    C->>B: 302 Found + Location: callback URL with authorization code
    Note over B,C: Authentication success + immediate redirect<br/>to callback URL (single HTTP response)
```

### Phase 6: OAuthコールバック処理

```mermaid
sequenceDiagram
    participant MC as MCP Client
    participant B as Browser
    participant AG as API Gateway
    participant L as Lambda

    Note over MC,L: Phase 6: OAuth Callback Processing (Standard OAuth)
    Note over C,B: Browser automatically follows redirect from Phase 5
    B->>AG: GET /oauth2/callback?code=...&state=... (callback to Lambda)
    AG->>L: Forward callback
    L->>L: Decode state to get original redirect_uri
    L->>L: Extract authorization code
    L->>AG: 302 Redirect to original client
    AG->>B: 302 Redirect response
    B->>MC: GET http://localhost:3000/callback?code=...&state=...
    Note right of MC: MCP Client receives standard OAuth callback<br/>with authorization code
```

### Phase 7: トークン交換（Lambdaプロキシ）

```mermaid
sequenceDiagram
    participant MC as MCP Client
    participant AG as API Gateway
    participant L as Lambda
    participant C as Cognito

    Note over MC,C: Phase 7: Token Exchange via Lambda Proxy
    MC->>AG: POST /oauth2/token
    Note over MC,AG: grant_type=authorization_code&<br/>code=...&<br/>client_id=cognito_client_id&<br/>code_verifier=...&<br/>redirect_uri=fixed_callback_url&<br/>resource=...
    AG->>L: Forward token request
    L->>L: Validate token request
    L->>L: Map to Cognito parameters
    L->>C: POST /oauth2/token (proxy to Cognito)
    Note over L,C: grant_type=authorization_code&<br/>code=...&<br/>client_id=cognito_client_id&<br/>code_verifier=...&<br/>redirect_uri=fixed_callback_url
    C->>C: Validate authorization code and PKCE
    C->>L: 200 OK + access_token, refresh_token
    L->>L: Enhance response with resource parameter
    L->>AG: 200 OK + enhanced token response
    AG->>MC: 200 OK + access_token with resource binding
    Note right of MC: Receives JWT access token<br/>with resource parameter binding
```

### Phase 8: 認証済みMCPリクエスト

```mermaid
sequenceDiagram
    participant MC as MCP Client
    participant AG as API Gateway
    participant L as Lambda
    participant C as Cognito

    Note over MC,L: Phase 8: Authenticated MCP Request
    MC->>AG: POST /mcp (Authorization: Bearer <access_token>)
    AG->>L: Forward request
    L->>L: authenticateRequest() - extract token
    L->>L: JWTValidator.validateToken() - verify with Cognito JWKS
    L->>L: Validate resource parameter matches expected resource
    L->>L: Validate token audience (aud claim)
    L->>L: Process MCP request (tools/list, etc.)
    L->>AG: 200 OK + MCP response
    AG->>MC: 200 OK + MCP response
    Note right of MC: Successfully authenticated<br/>MCP communication established

    Note over MC,L: Subsequent MCP Requests
    loop Ongoing MCP Communication
        MC->>AG: POST /mcp (with valid access_token)
        AG->>L: Forward request
        L->>L: Validate token + resource binding + process MCP request
        L->>AG: 200 OK + MCP response
        AG->>MC: 200 OK + MCP response
    end
```

## 前提条件

以下のツールがインストールされている必要があります：

- [SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html) - AWS SAMアプリケーションの構築・デプロイ用
- [Node.js 22](https://nodejs.org/en/) - NPMパッケージマネージャーを含む
- [Docker](https://hub.docker.com/search/?type=edition&offering=community) - ローカル実行・テスト用

## 環境変数の設定

OAuth認証サーバーは、template.yamlで以下の環境変数が自動的に設定されます：

```yaml
Environment:
  Variables:
    COGNITO_USER_POOL_ID: !Ref CognitoUserPool
    COGNITO_USER_POOL_CLIENT_ID: !Ref CognitoUserPoolClient
    COGNITO_DOMAIN: !Sub https://${CognitoUserPoolDomain}.auth.${AWS::Region}.amazoncognito.com
    API_BASE_URL: !Sub https://${HttpApi}.execute-api.${AWS::Region}.amazonaws.com
```

これらの環境変数は、デプロイ時にAWS Cognitoリソースから自動的に取得されるため、手動設定は不要です。

## デプロイ手順

### 1. アプリケーションのビルドとデプロイ

```bash
sam build
sam deploy --guided
```

デプロイ時の設定項目：
- **Stack Name**: CloudFormationスタック名
- **AWS Region**: デプロイ先のAWSリージョン
- **Confirm changes before deploy**: デプロイ前の変更確認の有無
- **Allow SAM CLI IAM role creation**: IAMロール作成の許可

デプロイ完了後、以下のリソースが自動的に作成されます：
- AWS Cognito User Pool（認証用）
- AWS Cognito User Pool Client（OAuth クライアント）
- AWS Cognito User Pool Domain（認証ドメイン）
- API Gateway（HTTPエンドポイント）

## ローカル開発・テスト

### 環境変数の設定

ローカル開発時は、実際の環境変数名を使用します：

```bash
# .env ファイル
COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
COGNITO_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
COGNITO_DOMAIN=https://your-stack-oauth-domain-123456789012.auth.us-east-1.amazoncognito.com
API_BASE_URL=http://localhost:3000
```

### ローカルAPIの起動

```bash
sam local start-api --env-vars env.json
```

`env.json`ファイルの例：

```json
{
  "HelloWorldFunction": {
    "COGNITO_USER_POOL_ID": "us-east-1_xxxxxxxxx",
    "COGNITO_USER_POOL_CLIENT_ID": "xxxxxxxxxxxxxxxxxxxxxxxxxx",
    "COGNITO_DOMAIN": "https://your-stack-oauth-domain-123456789012.auth.us-east-1.amazoncognito.com",
    "API_BASE_URL": "http://localhost:3000"
  }
}
```

### OAuth認証のテスト

1. **メタデータの取得**:
   ```bash
   curl http://localhost:3000/.well-known/oauth-authorization-server
   ```

2. **保護されたリソースメタデータの取得**:
   ```bash
   curl http://localhost:3000/.well-known/oauth-protected-resource
   ```

3. **クライアント登録**:
   ```bash
   curl -X POST http://localhost:3000/register \
     -H "Content-Type: application/json" \
     -d '{"client_name": "Test Client", "redirect_uris": ["http://localhost:3000/oauth2/callback"]}'
   ```

4. **認証フローの開始**:
   ```bash
   curl "http://localhost:3000/oauth2/authorize?client_id=your-client-id&response_type=code&redirect_uri=http://localhost:3000/oauth2/callback"
   ```

## MCPクライアントでの使用

OAuth認証付きMCPサーバーをMCPクライアントで使用する場合の設定例：

### VS Code設定例

```json
{
  "servers": {
    "oauth-mcp": {
      "url": "https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/mcp"
    }
  }
}
```

**注意**: OAuth認証フローは、MCPクライアントがOAuth認証をサポートしている場合に自動的に処理されます。クライアントがOAuth認証をサポートしていない場合は、事前にアクセストークンを取得してヘッダーに設定する必要があります。

## 実装の詳細

### 認証ミドルウェア

```typescript
export const authenticateRequest = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const token = authHeader.substring(7);
  // トークンの検証ロジック
  
  await next();
};
```

### OAuth エンドポイントの実装

各OAuth エンドポイントは個別のルートファイルで実装されており、標準的なOAuth 2.1仕様に準拠しています。

## ユニットテスト

テストは`hello-world/tests`フォルダに定義されています。現在のテストコードはSAM初期化時のテンプレートのままのため、MCP機能とOAuth認証機能に対応したテストに更新が必要です：

```bash
cd hello-world
npm install
npm run test
```

## リソースの削除

作成したリソースを削除するには：

```bash
sam delete --stack-name oauth-authorization
```

## 参考資料

- [OAuth 2.1 仕様](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-12)
- [MCP Authorization 仕様](https://modelcontextprotocol.io/docs/concepts/authorization)
- [Model Context Protocol 公式ドキュメント](https://modelcontextprotocol.io/)
- [Hono 公式ドキュメント](https://hono.dev/)
- [AWS SAM 開発者ガイド](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html)
