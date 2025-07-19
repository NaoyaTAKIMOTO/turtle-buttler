# AI カメ執事 LINE Bot

## プロジェクト概要
- **プロジェクト名**: Kame Butler (AI カメ執事)
- **バージョン**: 1.0.0
- **概要**: TypeScript/Node.js で実装された関西弁を話すカメ執事キャラクターの LINE Bot。  
  マイクロサービス・アーキテクチャを採用し、Firebase、Google Sheets、複数のLLM API、楽天APIを活用した高機能な対話システムです。
- 実装したいこと
  - ✅ スタンプ対応済み - ユーザーが送信したスタンプから感情を読み取り、適切な関西弁で応答
  - 🔄 計画中: Gemini Vision APIによるスタンプ画像認識での高精度感情分類
## アーキテクチャ

### プロジェクト構造
```
turtle-buttler/
├── src/                     # メインアプリケーション
├── apps/                    # マイクロサービス
│   ├── user-profile-service/ # ユーザープロファイル管理
│   └── rakuten-server/       # 楽天API ラッパー
├── config/                  # 設定ファイル
├── docs/                    # ドキュメント
└── infrastructure/          # インフラ設定
    ├── docker/             # Docker 設定
    ├── cloudbuild/         # Cloud Build 設定
    └── scripts/            # デプロイスクリプト
```

## 技術スタック

### コア技術
- **Runtime**: Node.js (v20) + TypeScript
- **Framework**: Express.js
- **Database**: Firebase Realtime Database
- **Logging**: Google Sheets API
- **Deployment**: Google Cloud Run
- **Container**: Docker

### AI & LLM
- **Cohere Command-R-Plus API**: 自然な関西弁会話
- **Google Gemini API**: 高度な推論とツール連携
- **感情分析**: カスタム実装

### 外部サービス連携
- **LINE Messaging API**: チャットインターフェース
- **楽天商品検索API**: 商品検索・推奨
- **MCP (Model Context Protocol)**: マイクロサービス連携

## 必要な環境変数
プロジェクトルートに `.env` ファイルを作成し、以下を設定してください:

### 必須環境変数
```bash
# Firebase
CREDENTIALS_ADMIN=<Base64エンコードされたFirebase Admin SDK JSON>
FIREBASE_URL=<Firebase Realtime Database URL>

# Google Services  
CREDENTIALS=<Base64エンコードされたGoogle API認証情報JSON>
SPREADSHEET_ID=<Google Sheets スプレッドシートID>

# LINE Messaging API
CHANNEL_ACCESS=<LINEチャネルアクセストークン>
CHANNEL_SECRET=<LINEチャネルシークレット>

# AI/LLM APIs
CO_API_KEY=<Cohere API キー>
GEMINI_API_KEY=<Google Gemini API キー>

# 楽天API
RAKUTEN_APPLICATION_ID=<楽天アプリケーションID>
RAKUTEN_AFFILIATE_ID=<楽天アフィリエイトID>

# システム設定
PORT=8080
NODE_ENV=development
```

### オプション（マイクロサービス利用時）
```bash
USER_PROFILE_SERVICE_URL=<ユーザープロファイルサービスURL>
RAKUTEN_SERVER_URL=<楽天サーバーURL>
```

## 開発環境セットアップ

### 1. 依存関係のインストール
```bash
# メインアプリケーション
npm install

# マイクロサービス（オプション）
cd apps/user-profile-service && npm install
cd apps/rakuten-server && npm install
```

### 2. ビルド
```bash
# メインアプリケーションのみ
npm run build

# 全アプリケーション
make build-all
```

### 3. ローカル実行
```bash
# 開発環境で実行
npm start

# または make コマンド
make build && npm start
```

## GCP デプロイ

### 前提条件
```bash
# GCP CLI 認証
gcloud auth login
gcloud config set project turtle-buttler

# 環境変数の設定
# .env ファイルを作成し、必要な環境変数を設定
```

### デプロイコマンド
```bash
# 全サービスデプロイ（推奨）
make deploy-all

# 個別デプロイ
make setup          # GCP シークレットセットアップ
make deploy-mcp     # マイクロサービスデプロイ
make deploy         # メインアプリケーションデプロイ
```

### 現在のデプロイ先
- **メインアプリケーション**: `https://turtle-buttler-65391589168.asia-northeast1.run.app`
- **リージョン**: asia-northeast1 (東京)
- **プラットフォーム**: Google Cloud Run

## テスト

### 単体テスト
```bash
# メインアプリケーションのテスト
npm test
```

### E2E テスト（Docker）
```bash
# Docker を使用した統合テスト
docker rm -f turtle-buttler || true
docker build -f infrastructure/docker/Dockerfile -t turtle-buttler .
docker run -d --name turtle-buttler -p 8080:8080 --env-file .env -e NODE_ENV=test turtle-buttler
sleep 2
curl -s -X POST http://localhost:8080/ \
  -H "Content-Type: application/json" \
  --data @config/dummy_line_request.json
echo "\n--- LOGS ---"
docker logs turtle-buttler
```

## Docker での実行

### ローカル Docker 実行
```bash
# イメージのビルド（新しいDockerfile パス）
docker build -f infrastructure/docker/Dockerfile -t kame-buttler .

# コンテナの起動
docker run -d -p 8080:8080 --env-file .env kame-buttler
```

### Docker Compose（開発環境）
```bash
# docker-compose での起動
docker-compose -f infrastructure/docker/docker-compose.yml up -d
```

## 主な機能

### 🤖 AI 会話システム
- **関西弁キャラクター**: 穏やかなカメ執事として一貫したペルソナ
- **現在メッセージ重視**: 過去の発言への言及を避け、今の会話に集中
- **感情分析**: ユーザーの感情を理解し適切に応答
- **会話履歴管理**: 直近2メッセージに制限し、長期記憶は要約で保持

### 🛍️ 商品推奨システム
- **楽天API連携**: ユーザーの感情や趣味に基づく商品提案
- **Gemini Function Calling**: ツール連携による自然な商品検索
- **文脈理解**: 会話の流れから適切なタイミングで商品提案

### 👤 ユーザープロファイル管理
- **名前・好み追跡**: 食べ物、色、音楽、場所の好みを学習
- **感情状態記録**: 会話中の感情変化を追跡
- **最近の話題**: ユーザーの関心事を記憶

### 🔧 技術的機能
- **マイクロサービス対応**: MCP プロトコルでサービス間通信
- **フォールバック機能**: MCP サービス不可時の自動代替処理
- **メッセージログ**: Google Sheets への全会話記録
- **エラーハンドリング**: 堅牢なエラー処理とリトライ機能

## アプリケーション構成

### メインアプリケーション (`src/`)
- **`kame_buttler.ts`**: 
  - LINE Messaging API との統合とメインロジック
  - LLM 連携 (Cohere/Gemini) とプロンプト管理
  - MCP ツール呼び出しとフォールバック処理
  - ユーザー情報管理と感情分析
- **`prompts.ts`**: 
  - カメ執事キャラクターのシステムプロンプト
  - ユーザー情報プロンプトテンプレート
  - 応答原則と制約定義
- **`kame_buttler.test.ts`**: 
  - 単体テストとモック実装
  - テスト環境用インメモリストア

### マイクロサービス (`apps/`)
- **`user-profile-service/`**: 
  - Firebase Realtime Database 連携
  - ユーザープロファイル CRUD API
  - RESTful エンドポイント提供
- **`rakuten-server/`**: 
  - 楽天商品検索 API ラッパー
  - MCP プロトコル対応
  - 商品データ正規化

### インフラストラクチャ (`infrastructure/`)
- **`docker/`**: コンテナ化設定
- **`cloudbuild/`**: GCP Cloud Build パイプライン
- **`scripts/`**: デプロイメント自動化

## 開発における注意点

### プロンプト設計
- **現在メッセージ重視**: 過去の発言への言及を避ける
- **会話履歴制限**: 直近2メッセージのみコンテキストに含める
- **キャラクター一貫性**: 関西弁と穏やかな執事口調の維持

### マイクロサービス連携
- **MCP プロトコル**: `callMcpTool()` 関数でサービス間通信
- **フォールバック**: MCP 不可時は HTTP 直接通信またはモック
- **エラーハンドリング**: サービス障害時の適切な代替処理

### セキュリティ
- **認証情報管理**: GCP Secret Manager で一元管理
- **Base64 エンコーディング**: JSON 認証情報の安全な保存
- **環境変数分離**: 開発・本番環境の適切な分離

## 今後の開発方針

### 🎯 次期実装予定: Gemini Vision API スタンプ画像認識

#### 実装計画
1. **スタンプ画像取得**
   - LINE スタンプ画像URL構築: `https://stickershop.line-scdn.net/stickershop/v1/sticker/{stickerId}/android/sticker.png`
   - 画像ダウンロード・キャッシュ機能

2. **Gemini Vision API統合**
   ```typescript
   // 既存のGemini API認証を活用
   const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
     headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY },
     body: JSON.stringify({
       contents: [{
         parts: [
           { text: "このLINEスタンプの感情を分析してください。happy, sad, angry, surprised, love, neutral のいずれかで答えてください。" },
           { inline_data: { mime_type: "image/png", data: base64Image } }
         ]
       }]
     })
   });
   ```

3. **感情分析ロジック拡張**
   - 既知スタンプマッピング → Gemini Vision API → neutralフォールバック
   - 分析結果のキャッシュ機能（Firebase/ファイル）
   - コスト最適化: 人気スタンプの事前分析

4. **パフォーマンス最適化**
   - 画像圧縮・リサイズ処理
   - 非同期処理による応答速度維持
   - エラーハンドリング強化

#### 技術的利点
- **既存認証活用**: 現在のGEMINI_API_KEYをそのまま利用
- **高精度認識**: 表情、キャラクター、テキストを総合的に分析
- **コスト効率**: Gemini Visionは他のVision APIより安価
- **日本語対応**: スタンプの日本語テキストも正確に認識

### 🚀 その他の開発方針
- **多言語対応**: 関西弁以外の方言・言語サポート
- **高度な感情分析**: より精密な感情理解とパーソナライゼーション
- **商品推奨精度向上**: ユーザー行動学習とレコメンドアルゴリズム改善
- **マルチモーダル対応**: 画像・音声メッセージへの対応
- **A/B テスト機能**: プロンプト最適化とユーザー体験向上
