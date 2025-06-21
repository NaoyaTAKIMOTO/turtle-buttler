# AI カメ執事 LINE Bot

## プロジェクト概要
- プロジェクト名: Kame Butler
- バージョン: 1.0.0
- 概要: Express/Node.js と TypeScript で実装された LINE Messaging API ボット。  
  Firebase Realtime Database、Google Sheets、Cohere API、Gemini API、楽天APIを活用し、ユーザー情報管理やメッセージログの記録、LLM 連携による応答生成を行います。また、独立したユーザープロファイルサービスも提供します。

## 技術スタック
- Node.js (v20) + TypeScript
- Express フレームワーク
- Firebase Admin SDK (Realtime Database)
- Google Sheets API
- Cohere Command-R-Plus API
- Google Gemini API
- 楽天商品検索API
- dotenv
- Docker

## 必要な環境変数
プロジェクトルートに `.env` ファイルを作成し、以下を設定してください（Base64エンコード済みの JSON を利用）:

```
CREDENTIALS_ADMIN        // Firebase Admin SDK サービスアカウント JSON を Base64 エンコードした文字列
CREDENTIALS              // Google API 認証情報 JSON を Base64 エンコードした文字列
CREDENTIALS_JSON         // Base64 未使用時の Google API 認証ファイルパス
FIREBASE_URL             // Firebase Realtime Database の URL
SPREADSHEET_ID           // Google Sheets のスプレッドシート ID
CHANNEL_ACCESS           // LINE Messaging API チャネルアクセストークン
CHANNEL_SECRET           // LINE Messaging API チャネルシークレット
CO_API_KEY               // Cohere API キー
PORT                     // ボットがリッスンするポート番号（省略時 8080）
NODE_ENV                 // 実行環境（development|production）
```

## セットアップ & 実行

```bash
# 依存関係をインストール
npm install

# TypeScript をコンパイル
npm run build

# アプリケーションを起動
npm start
```

## ビルド&デプロイ
```zsh
bash scripts/setup_gcp.sh || 
gcloud builds submit --config=cloudbuild.yaml .
```
前提として、

gcloud auth login による認証済み
gcloud config set project YOUR_PROJECT_ID で対象プロジェクトが設定済み
であることを確認してください。

## テスト

```bash
npm test
```

### e2e
```zsh
docker rm -f turtle-buttler ||docker build -t turtle-butter . || true && docker run -d --name turtle-buttler -p 8080:8080 --env-file .env -e NODE_ENV=test turtle-buttler && sleep 2 && curl -s -X POST http://localhost:8080/ -H "Content-Type: application/json" --data @dummy_line_request.json && echo "\n--- LOGS ---" && docker logs turtle-buttler
```

## Docker での実行

Docker イメージをビルド・実行する手順:

```bash
# イメージのビルド
docker build -t kame-buttler .

# コンテナの起動（ポートマッピング: 8080）
docker run -d -p 8080:8080 --env-file .env kame-buttler

```

### Dockerfile

```dockerfile
FROM node:20-alpine
WORKDIR /app

# 依存関係インストール
COPY package*.json tsconfig.json ./
RUN npm install

# ソースコピー & ビルド
COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 8080

CMD ["npm", "run", "start"]
```

## 主な機能
- LINE からのメッセージ受信・応答 (Express + body-parser)
- Firebase Realtime Database を利用したユーザー情報管理と保存
- Google Sheets API を利用したメッセージログ記録
- **LLM 連携による応答生成**:
  - Cohere Command-R-Plus API を利用した自然な会話応答
  - Google Gemini API を利用した高度な応答生成とツール連携
- **外部ツール連携**:
  - 楽天商品検索API を利用した商品情報の検索
- ユーザー固有のペルソナ管理（名前、好きな食べ物、最近の話題など）
- 簡易感情分析

## アプリケーション構成
- `src/kame_buttler.ts`:
  - メインエントリーポイント。LINE Messaging APIからのリクエストを処理し、各種ハンドラーを呼び出します。
  - 環境変数の読み込み、Firebase Admin SDKの初期化、Expressサーバーのセットアップとルーティング定義を行います。
  - ユーザー情報管理、メッセージログ記録、LLM連携（Cohere/Gemini）、感情分析、楽天API連携などの主要なロジックを実装しています。
- `test_rakuten_search.ts`:
  - `kame_buttler.ts`内で定義されている楽天商品検索API連携機能のテストスクリプトです。
- `user-profile-service/src/index.ts`:
  - 独立したユーザープロファイルサービスのエントリーポイント。
  - Firebase Realtime Database を利用してユーザープロファイルの取得と更新を行う RESTful API を提供します。
- 各種ハンドラー関数:
  - ユーザー情報管理、メッセージログ記録、LLM連携、感情分析などを実装しています。

## 今後の開発方針
- 会話履歴を活用した文脈理解の強化
- 外部ツール連携機能の実装 (Function Calling 等)
- 応答エラーハンドリングの強化
- ペルソナ維持の改善
- 感情分析の強化
- userinfoの更新アルゴリズムの強化
