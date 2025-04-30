# AI カメ執事 LINE Bot

## プロジェクト概要
- プロジェクト名: Kame Buttler
- バージョン: 1.0.0
- 説明: AI Kame Buttlerは、LINE Botを通じてユーザーと対話し、FirebaseやGoogle Sheetsを利用してデータを管理するアプリケーションです。

## セットアップ手順
- 必要な環境変数を設定するために、`.env`ファイルを作成し、以下の情報を記載します。
  - `CREDENTIALS_ADMIN_BASE64`
  - `FIREBASE_URL`
  - `CHANNEL_ACCESS`
  - `CHANNEL_SECRET`
  - `CO_API_KEY`
- `credentials.json`と`credentials-admin.json`をプロジェクトルートに配置します。

## 依存関係のインストール
- プロジェクトの依存関係をインストールするには、以下のコマンドを実行します。
  ```bash
  npm install
  ```

## ビルドと実行
- TypeScriptをJavaScriptにコンパイルするには、以下のコマンドを実行します。
  ```bash
  npm run build
  ```
- アプリケーションを起動するには、以下のコマンドを実行します。
  ```bash
  npm start
  ```

## テスト
- テストを実行するには、以下のコマンドを使用します。
  ```bash
  npm test
  ```

## 主な機能
- LINEからのメッセージを処理し、ユーザー情報をFirebaseに保存。
- スプレッドシートにメッセージログを記録。
- ユーザーの感情分析を行い、応答を生成。

Google Apps Script (GAS) を利用して開発された LINE Messaging API ボットです。大規模言語モデル (LLM) と連携し、ユーザーからのメッセージに応答します。AI カメ執事という固有のペルソナを持ち、調査協力や悩み相談に応じます。

## 仕様 (Current Features)

*   **インターフェース**: LINE Messaging API を介したメッセージの受信と応答。
*   **開発プラットフォーム**: Google Apps Script (GAS)。
*   **LLM連携**:
    *   Cohere Command-R-Plus API を利用した応答生成 (`postCommandR` 関数)。
    *   Google Gemini Pro API を利用した応答生成機能も実装済み (`getGeminiApi` 関数)。
*   **ユーザー情報管理**: Firebase Realtime Database を使用して、ユーザーIDごとに以下の情報を管理。
    *   ユーザー名
    *   チャット履歴
    *   最近の話題
    *   好きな食べ物、好きな色、好きな音楽、好きな場所
*   **感情分析**: ユーザーの感情を分析する機能があります。
*   **ペルソナ**: 「AI カメ執事」
    *   ウミガメの執事という設定。
    *   お好み焼きが好き。
    *   関西弁で応答 (`~やで` など)。
    *   調べ物には真摯に協力。
    *   悩み事には共感を示しつつ解決策を提示（共感、自己開示、質問の三段階アプローチ）。
    *   プログラミングに関する質問には答えない。
*   **メッセージログ**: 受信したユーザーメッセージとボットの応答を Google Spreadsheet に記録。タイムスタンプ、ユーザーID、メッセージ内容が記録されます。
*   **ユーザー設定**: ユーザーは以下の情報を更新できます。
    *   名前
    *   好きな食べ物
    *   好きな色
    *   好きな音楽
    *   好きな場所

## Cloud Run へのデプロイ

このプロジェクトは、Cloud Runを利用してデプロイすることができます。デプロイには`cloudrun.yaml`ファイルを使用します。このファイルには、以下のような設定が含まれています。

- **サービス名**: turtle-buttler
- **名前空間**: turtle-buttler
- **コンテナイメージ**: asia.gcr.io/turtle-buttler/kame-buttler
- **環境変数**:
  - `FIREBASE_URL`: Firebase Realtime DatabaseのURL
  - `FIREBASE_API_KEY`: FirebaseのAPIキー
  - `SPREADSHEET_ID`: GoogleスプレッドシートのID
  - `CO_API_KEY`: Cohere APIキー
  - `CHANNEL_ACCESS`: LINEチャネルアクセストークン
  - `CHANNEL_SECRET`: LINEチャネルシークレット
  - `CREDENTIALS_ADMIN_BASE64`: Firebase Admin SDKの認証情報
  - `PORT`: アプリケーションがリッスンするポート番号

1.  **Dockerfile の準備**: プロジェクトのルートディレクトリに `Dockerfile` が存在することを確認してください。Dockerfile は、アプリケーションをコンテナ化するための手順を記述したファイルです。もし存在しない場合は、以下の内容で `Dockerfile` を作成してください。

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "start"]
```

2.  **Google Cloud SDK のインストールと初期化**: Google Cloud Platform (GCP) にアクセスするために、Google Cloud SDK をインストールし、初期化します。

    *   [Google Cloud SDK のインストール](https://cloud.google.com/sdk/docs/install)
    *   SDK の初期化: `gcloud init` コマンドを実行し、指示に従って GCP プロジェクトを選択し、認証を行います。

3.  **Cloud Run へのデプロイ**: 以下のコマンドを実行して、Cloud Run にアプリケーションをデプロイします。

```bash
gcloud run deploy ai-kame-butler \
    --source . \
    --region asia-northeast1 \
    --platform managed \
    --allow-unauthenticated
```

    *   `ai-kame-butler`: Cloud Run サービスの名前です。任意の名前に変更できます。
    *   `--source .`: 現在のディレクトリをソースコードの場所として指定します。
    *   `--region asia-northeast1`: デプロイ先のリージョンを指定します。東京リージョンを使用しています。
    *   `--platform managed`: マネージドプラットフォームを使用します。
    *   `--allow-unauthenticated`: 認証なしでアクセスできるようにします。必要に応じて認証を設定してください。

4.  **デプロイの確認**: デプロイが完了すると、Cloud Run サービスの URL が表示されます。この URL にアクセスして、アプリケーションが正常に動作していることを確認してください。

## 今後の開発方針 (Future Development / Roadmap)

AI カメ執事の機能を強化し、より賢く、よりユーザーにとって役立つ存在にすることを目指します。

1.  **会話履歴機能の改善**
    *   **目的**: ユーザーとの過去のやり取りを LLM への入力として渡すことで、文脈を理解した、より自然で一貫性のある会話を実現する。
    *   **実装ステップ**:
        *   Firebase Realtime Database から会話履歴を取得し、LLMへの入力として使用する機能の改善。
        *   コンテキストウィンドウの制限を考慮し、渡す履歴の件数や形式を調整。
        *   会話履歴の保存期間や管理方法を検討。
2.  **外部ツール連携 (Tool Use / Function Calling)**
    *   **目的**: LLM の Tool Use / Function Calling 機能を利用し、外部サービス (Google検索、Googleカレンダー、天気予報など) と連携して、より高度な情報提供やタスク実行を可能にする。
    *   **実装ステップ**:
        *   連携したい外部ツールと、それを使って実現したい具体的な機能を定義。
        *   各外部ツールに対応する GAS 関数 (Tool Function) を実装。
        *   LLM (特に Command-R-Plus や Gemini Pro はこの機能をサポート) がこれらのツールを利用できるよう、API リクエストに利用可能なツール定義を追加。
        *   LLM からの応答をパースし、ツール実行の指示があれば対応する GAS 関数を呼び出すロジックを実装。
        *   ツール実行結果を再び LLM に渡し、最終的な応答を生成させる一連のフローを実装。
3.  **応答の安定化とエラーハンドリング**
    *   **目的**: LLMからの不適切な応答 (Safety filterによるブロックなど) や、API通信エラー、ツール連携失敗時などに、ユーザーに分かりやすい形で状況を伝え、会話が途絶えないようにする。
    *   **実装ステップ**:
        *   LLM レスポンスの `finishReason` やエラーコードを確認し、適切なフォールバックメッセージを生成する処理を追加。
        *   API通信時のエラー (UrlFetchApp の例外など) を捕捉し、リトライ処理やエラー通知を行う機構を検討。
4.  **ペルソナの維持・強化**
    *   **目的**: 会話履歴やツール連携による複雑なやり取りの中でも、AI カメ執事のペルソナ (関西弁、お好み焼き好き、執事口調など) を一貫して維持・強化する。
    *   **実装ステップ**:
        *   システムプロンプトの調整。
        *   生成された応答がペルソナに合っているかを確認し、必要に応じて後処理で調整を加えることを検討。

これらの開発を進めることで、AI カメ執事は単なる応答ボットではなく、ユーザーの専属執事として、よりパーソナルで役立つ存在になっていくことを目指します。
