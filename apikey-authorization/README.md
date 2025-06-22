# API Key Authorization MCP Server

AWS Lambda上で動作するAPIキー認証機能付きMCP（Model Context Protocol）サーバーのサンプル実装です。

## 概要

このプロジェクトは、シンプルなAPIキー認証機能を持つMCPサーバーの実装例を提供します。Honoフレームワークのベアラートークン認証ミドルウェアを使用し、セキュアでありながら実装が簡単なMCPサーバーをAWS Lambda上で構築する方法を示しています。

## 特徴

- **APIキー認証**: シンプルで実装しやすいベアラートークン認証
- **AWS Lambda対応**: サーバーレス環境での動作に最適化
- **Honoフレームワーク**: 軽量で高速なWebフレームワークを使用
- **Streamable HTTP**: MCPのStreamable HTTP仕様をステートレスで実装
- **TypeScript**: 型安全性を確保した開発
- **環境変数設定**: APIキーの安全な管理
- **認証ミドルウェア**: Honoの組み込み認証機能を活用

## 技術スタック

- **MCP TypeScript SDK**: Model Context Protocolの公式TypeScript実装
- **Hono**: Web Standards準拠の軽量Webフレームワーク
- **Hono Bearer Auth**: Honoの組み込みベアラートークン認証ミドルウェア
- **fetch-to-node**: MCPのTypeScript SDKとHonoの互換性のためのアダプター
- **AWS Lambda**: サーバーレス実行環境
- **AWS SAM**: サーバーレスアプリケーションの構築・デプロイツール

## プロジェクト構成

```
apikey-authorization/
├── hello-world/          # Lambda関数のTypeScriptコード
│   ├── app.ts           # メインアプリケーションファイル
│   ├── package.json     # 依存関係の定義
│   └── tests/           # ユニットテスト
├── events/              # 関数呼び出し用のテストイベント
├── template.yaml        # AWSリソース定義（SAMテンプレート）
└── samconfig.toml       # SAM設定ファイル
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

**注意**: このツールにアクセスするには有効なAPIキーが必要です。

## 認証方式

このサーバーはHTTPヘッダーでのベアラートークン認証を使用します：

```
Authorization: Bearer YOUR_API_KEY
```

認証が失敗した場合、以下のエラーレスポンスが返されます：
- **401 Unauthorized**: APIキーが無効または未提供
- **403 Forbidden**: APIキーの形式が正しくない

## 前提条件

以下のツールがインストールされている必要があります：

- [SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html) - AWS SAMアプリケーションの構築・デプロイ用
- [Node.js 22](https://nodejs.org/en/) - NPMパッケージマネージャーを含む
- [Docker](https://hub.docker.com/search/?type=edition&offering=community) - ローカル実行・テスト用

## 環境変数の設定

APIキー認証を正しく動作させるために、以下の環境変数を設定する必要があります：

```bash
export API_KEY="your-secret-api-key"
```

template.yamlでは以下のように設定されています：

```yaml
Environment:
  Variables:
    API_KEY: your-secret-api-key-here
```

**注意**: デプロイ前に`template.yaml`の`API_KEY`の値を実際のAPIキーに変更してください。

## デプロイ手順

### 1. APIキーの設定

デプロイ前に`template.yaml`のAPIキーを変更します：

```yaml
Environment:
  Variables:
    API_KEY: your-actual-secret-api-key-here
```

### 2. アプリケーションのビルドとデプロイ

```bash
sam build
sam deploy --guided
```

デプロイ時の設定項目：
- **Stack Name**: CloudFormationスタック名
- **AWS Region**: デプロイ先のAWSリージョン
- **Confirm changes before deploy**: デプロイ前の変更確認の有無
- **Allow SAM CLI IAM role creation**: IAMロール作成の許可

### 3. セキュアな設定（推奨）

本番環境では、APIキーをAWS Secrets Managerに保存することを強く推奨します：

```yaml
Environment:
  Variables:
    API_KEY: !Sub '{{resolve:secretsmanager:${SecretName}:SecretString:api_key}}'
```

## ローカル開発・テスト

### 環境変数の設定

ローカル開発時は環境変数を設定します：

```bash
export API_KEY="test-api-key-12345"
```

または、`env.json`ファイルを作成：

```json
{
  "HelloWorldFunction": {
    "API_KEY": "test-api-key-12345"
  }
}
```

### ローカルAPIの起動

```bash
sam local start-api --env-vars env.json
```

### 認証のテスト

1. **認証なしでのアクセス（エラーになる）**:
   ```bash
   curl -X POST http://localhost:3000/mcp \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}'
   ```

2. **正しいAPIキーでのアクセス**:
   ```bash
   curl -X POST http://localhost:3000/mcp \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer test-api-key-12345" \
     -d '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}'
   ```

3. **BMI計算ツールの使用**:
   ```bash
   curl -X POST http://localhost:3000/mcp \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer test-api-key-12345" \
     -d '{
       "jsonrpc": "2.0",
       "method": "tools/call",
       "params": {
         "name": "calculate-bmi",
         "arguments": {
           "weightKg": 70,
           "heightM": 1.75
         }
       },
       "id": 1
     }'
   ```

## MCPクライアントでの使用

APIキー認証付きMCPサーバーをMCPクライアントで使用する場合の設定例：

### VS Code設定例

```json
{
  "servers": {
    "apikey-authorization": {
      "url": "https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/mcp",
      "headers": {
        "Authorization": "Bearer your-secret-api-key-here"
      }
    }
  }
}
```

### カスタムMCPクライアント設定例

```typescript
const client = new Client({
  name: "apikey-mcp-client",
  version: "1.0.0"
}, {
  capabilities: {}
});

// HTTPヘッダーにAPIキーを設定
const transport = new HTTPClientTransport({
  baseURL: "https://your-api-gateway-url",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY"
  }
});
```

## セキュリティ考慮事項

### APIキーの管理

- **強力なAPIキー**: 十分に長く、ランダムな文字列を使用
- **定期的な更新**: APIキーを定期的に更新
- **安全な保存**: AWS Secrets Manager等の安全な場所に保存
- **環境分離**: 開発・ステージング・本番で異なるAPIキーを使用

### 通信の保護

- **HTTPS必須**: 本番環境では必ずHTTPS通信を使用
- **CORS設定**: 適切なCORS設定を行う
- **レート制限**: API Gateway等でレート制限を設定

### ログとモニタリング

- **アクセスログ**: 認証の成功・失敗をログに記録
- **異常検知**: 不正なアクセス試行の監視
- **アラート設定**: 異常なアクセスパターンの検知

## 実装の詳細

### ベアラー認証ミドルウェア

```typescript
import { bearerAuth } from 'hono/bearer-auth';

const authMiddleware = bearerAuth({
    token: process.env.API_KEY || '',
    invalidTokenMessage: 'Invalid API key',
    noAuthenticationHeaderMessage: 'Authorization header is required',
});
```

### 認証付きエンドポイント

```typescript
app.post('/mcp', authMiddleware, async (c) => {
    console.log('Received authenticated POST MCP request');
    // MCP処理ロジック
});
```

## トラブルシューティング

### よくある問題

1. **401 Unauthorized エラー**:
   - APIキーが設定されているか確認
   - Authorizationヘッダーの形式が正しいか確認
   - APIキーの値が正しいか確認

2. **環境変数が読み込まれない**:
   - Lambda関数の環境変数設定を確認
   - ローカル実行時は`env.json`ファイルを確認

3. **CORS エラー**:
   - API GatewayのCORS設定を確認
   - プリフライトリクエストの処理を確認

### デバッグ方法

```bash
# ログの確認
sam logs -n HelloWorldFunction --stack-name apikey-authorization --tail

# ローカルでのデバッグ実行
sam local start-api --env-vars env.json --debug
```

## ユニットテスト

テストは`hello-world/tests`フォルダに定義されています。現在のテストコードはSAM初期化時のテンプレートのままのため、MCP機能と認証機能に対応したテストに更新が必要です：

```bash
cd hello-world
npm install
npm run test
```

## リソースの削除

作成したリソースを削除するには：

```bash
sam delete --stack-name apikey-authorization
```

## 他の認証方式との比較

| 認証方式 | 実装の複雑さ | セキュリティレベル | 用途 |
|---------|------------|------------------|------|
| APIキー | 簡単 | 中程度 | 内部API、プロトタイプ |
| OAuth 2.1 | 複雑 | 高 | 外部API、エンタープライズ |
| JWT | 中程度 | 高 | マイクロサービス、SPA |

## 参考資料

- [Model Context Protocol 公式ドキュメント](https://modelcontextprotocol.io/)
- [Hono Bearer Auth ドキュメント](https://hono.dev/middleware/builtin/bearer-auth)
- [Hono 公式ドキュメント](https://hono.dev/)
- [AWS SAM 開発者ガイド](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html)
- [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/)
- [API セキュリティベストプラクティス](https://owasp.org/www-project-api-security/)
