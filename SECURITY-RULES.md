# Firebase Realtime Database セキュリティルール

カメ執事AI用のFirebase Realtime Databaseセキュリティルールです。

## ルールファイル一覧

### 1. `database-rules.json` - 基本ルール
- **用途**: 開発・テスト環境
- **特徴**: 基本的なバリデーション、柔軟なアクセス制御
- **認証**: クライアント認証ベース

### 2. `database-rules-production.json` - 本番用ルール  
- **用途**: 本番環境（現在の推奨）
- **特徴**: Admin SDK前提、実用的なバリデーション
- **認証**: Firebase Admin SDK経由のみ

### 3. `database-rules-secure.json` - 高セキュリティルール
- **用途**: 将来の機能拡張時
- **特徴**: 厳格なバリデーション、XSS対策、詳細なアクセス制御
- **認証**: 多層認証、管理者権限分離

## データ構造

```
/
├── userProfiles/
│   └── {userId}/
│       ├── userId: string (LINE User ID)
│       ├── userName: string
│       ├── chatHistory: array
│       │   └── {timestamp, message, response}
│       ├── recentTopics: string[]
│       ├── preferences/
│       │   ├── favoriteFood: string
│       │   ├── language: string
│       │   ├── favoriteColor?: string
│       │   ├── favoriteMusic?: string
│       │   └── favoritePlace?: string
│       ├── sentiment?: string
│       ├── chatSummary?: string
│       ├── createdAt?: string
│       └── updatedAt?: string
├── systemStats/ (統計情報)
└── appConfig/ (アプリケーション設定)
```

## デプロイ方法

### Firebase CLIを使用

```bash
# 本番環境にデプロイ
firebase deploy --only database:default --project turtle-buttler

# 特定のルールファイルを指定
firebase deploy --only database --project turtle-buttler
```

### Firebase Consoleを使用

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. `turtle-buttler` プロジェクトを選択
3. 「Realtime Database」→「ルール」タブ
4. ルールファイルの内容をコピーペースト
5. 「公開」ボタンをクリック

## ルール選択の指針

### 現在の推奨: `database-rules-production.json`

**理由:**
- Firebase Admin SDKのみを使用する現在のアーキテクチャに最適
- 必要十分なバリデーション
- パフォーマンスと安全性のバランス

### 将来の拡張時: `database-rules-secure.json`

**適用タイミング:**
- LINEクライアントからの直接アクセスが必要になった場合
- より厳格なセキュリティが要求される場合
- 個人情報保護の強化が必要な場合

## セキュリティ考慮事項

### データ保護
- **個人情報**: chatHistory, preferences は厳格に保護
- **アクセス制御**: ユーザーは自分のデータのみアクセス可能
- **データ整合性**: 必須フィールドの検証

### 脆弱性対策
- **XSS防止**: 入力値のサニタイゼーション
- **SQLインジェクション**: バリデーションルールで防止
- **データサイズ制限**: DoS攻撃防止

### 監査ログ
- **アクセスログ**: Firebase Consoleで確認可能
- **エラーログ**: システム管理者向けの詳細ログ

## トラブルシューティング

### ルール検証エラー
```bash
# ルールの構文チェック
firebase database:profile --input database-rules-production.json
```

### パフォーマンス問題
- インデックスの設定確認
- ルールの複雑度軽減
- データ構造の最適化

## メンテナンス

### 定期レビュー
- **月次**: アクセスパターンの確認
- **四半期**: セキュリティルールの見直し
- **年次**: データ保持ポリシーの確認

### アップデート手順
1. 開発環境でテスト
2. ステージング環境で検証  
3. 本番環境にデプロイ
4. 動作確認