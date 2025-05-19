# AI カメ執事 LINE Bot

## プロジェクト概要
- プロジェクト名: Kame Butler
- バージョン: 1.0.0
- 概要: Express/Node.js と TypeScript で実装された LINE Messaging API ボット。  
  Firebase Realtime Database、Google Sheets、Cohere API を活用し、ユーザー情報管理やメッセージログの記録、LLM 連携による応答生成を行います。

## 技術スタック
- Node.js (v20) + TypeScript
- Express フレームワーク
- Firebase Admin SDK (Realtime Database)
- Google Sheets API
- Cohere Command-R-Plus API
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
- Firebase Realtime Database へのユーザー情報保存
- Google Sheets API を利用したメッセージログ記録
- Cohere Command-R-Plus API を利用した LLM 連携による応答生成
- ユーザー固有のペルソナ管理（名前、好きな食べ物、最近の話題など）
- 簡易感情分析

## アプリケーション構成
- `src/kame_buttler.ts`  
  メインエントリーポイント。環境変数の読み込み、Firebase 初期化、Express サーバーのセットアップとルーティング定義。
- 各種ハンドラー関数  
  ユーザー情報管理、メッセージログ記録、LLM 連携、感情分析などを実装。

## 今後の開発方針
- 会話履歴を活用した文脈理解の強化
- 外部ツール連携機能の実装 (Function Calling 等)
- 応答エラーハンドリングの強化
- ペルソナ維持の改善
- 感情分析の強化
- userinfoの更新アルゴリズムの強化
