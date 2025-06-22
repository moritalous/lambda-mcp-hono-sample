# Simple MCP Server

AWS Lambda上で動作するシンプルなMCP（Model Context Protocol）サーバーのサンプル実装です。

## 概要

このプロジェクトは、HonoフレームワークとMCP TypeScript SDKを使用して、AWS Lambda上でMCPサーバーを構築する基本的な例を提供します。認証機能は含まれておらず、MCPの基本的な仕組みを理解するためのシンプルな実装となっています。

## 特徴

- **AWS Lambda対応**: サーバーレス環境での動作に最適化
- **Honoフレームワーク**: 軽量で高速なWebフレームワークを使用
- **Streamable HTTP**: MCPのStreamable HTTP仕様をステートレスで実装
- **TypeScript**: 型安全性を確保した開発
- **BMI計算ツール**: サンプルとしてBMI計算機能を提供

## 技術スタック

- **MCP TypeScript SDK**: Model Context Protocolの公式TypeScript実装
- **Hono**: Web Standards準拠の軽量Webフレームワーク
- **fetch-to-node**: MCPのTypeScript SDKとHonoの互換性のためのアダプター
- **AWS Lambda**: サーバーレス実行環境
- **AWS SAM**: サーバーレスアプリケーションの構築・デプロイツール

## プロジェクト構成

```
simple-mcp/
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

## 前提条件

以下のツールがインストールされている必要があります：

- [SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html) - AWS SAMアプリケーションの構築・デプロイ用
- [Node.js 22](https://nodejs.org/en/) - NPMパッケージマネージャーを含む
- [Docker](https://hub.docker.com/search/?type=edition&offering=community) - ローカル実行・テスト用

## 開発環境のセットアップ

AWS Toolkitを使用することで、統合開発環境（IDE）でアプリケーションの構築・テストが可能です：

- [VS Code](https://docs.aws.amazon.com/toolkit-for-vscode/latest/userguide/welcome.html)
- [IntelliJ](https://docs.aws.amazon.com/toolkit-for-jetbrains/latest/userguide/welcome.html)
- [WebStorm](https://docs.aws.amazon.com/toolkit-for-jetbrains/latest/userguide/welcome.html)
- その他のJetBrains IDE

## デプロイ手順

### 1. アプリケーションのビルドとデプロイ

初回デプロイ時は以下のコマンドを実行します：

```bash
sam build
sam deploy --guided
```

`sam deploy --guided`実行時に以下の項目を設定します：

- **Stack Name**: CloudFormationスタック名（プロジェクト名に合わせて設定）
- **AWS Region**: デプロイ先のAWSリージョン
- **Confirm changes before deploy**: デプロイ前の変更確認の有無
- **Allow SAM CLI IAM role creation**: IAMロール作成の許可
- **Save arguments to samconfig.toml**: 設定の保存（次回以降は`sam deploy`のみで実行可能）

デプロイ完了後、出力にAPI Gateway EndpointのURLが表示されます。

### 2. 設定の保存

初回デプロイ時に設定を保存した場合、次回以降は以下のコマンドでデプロイできます：

```bash
sam build
sam deploy
```

## ローカル開発・テスト

### アプリケーションのビルド

```bash
sam build
```

SAM CLIは`hello-world/package.json`で定義された依存関係をインストールし、esbuildでTypeScriptをコンパイルして、`.aws-sam/build`フォルダにデプロイメントパッケージを作成します。

### 単一関数のテスト

テストイベントを使用して関数を直接呼び出すことができます：

```bash
sam local invoke HelloWorldFunction --event events/event.json
```

### ローカルAPIの起動

ローカル環境でAPIを起動してテストできます：

```bash
sam local start-api
```

起動後、以下のURLでアクセス可能です：
- `http://localhost:3000/mcp` - MCPエンドポイント

### MCPクライアントでのテスト

デプロイ後、MCPクライアント（VS Code、Claude Desktop等）から以下の設定でサーバーに接続できます：

```json
{
  "servers": {
    "simple-mcp": {
      "url": "https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/mcp"
    }
  }
}
```

## ユニットテスト

テストは`hello-world/tests`フォルダに定義されています。現在のテストコードはSAM初期化時のテンプレートのままのため、MCP機能に対応したテストに更新が必要です：

```bash
cd hello-world
npm install
npm run test
```

## ログの確認

デプロイされたLambda関数のログを確認するには：

```bash
sam logs -n HelloWorldFunction --stack-name simple-mcp --tail
```

## リソースの削除

作成したリソースを削除するには：

```bash
sam delete --stack-name simple-mcp
```

## 実装の詳細

### MCPサーバーの初期化

```typescript
const server = new McpServer({
    name: 'example-server',
    version: '1.0.0',
});
```

### ツールの登録

```typescript
server.registerTool(
    'calculate-bmi',
    {
        description: 'Calculate Body Mass Index',
        inputSchema: {
            weightKg: z.number(),
            heightM: z.number(),
        },
    },
    async ({ weightKg, heightM }) => ({
        content: [
            {
                type: 'text',
                text: String(weightKg / (heightM * heightM)),
            },
        ],
    }),
);
```

### Streamable HTTPトランスポート

```typescript
const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
});
```

### HonoとMCPの統合

`fetch-to-node`パッケージを使用してHonoのRequestオブジェクトをNode.jsのreq/resオブジェクトに変換し、MCPサーバーとの互換性を確保しています。

## 参考資料

- [Model Context Protocol 公式ドキュメント](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Hono 公式ドキュメント](https://hono.dev/)
- [AWS SAM 開発者ガイド](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html)
- [AWS Lambda Node.js ランタイム](https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html)
