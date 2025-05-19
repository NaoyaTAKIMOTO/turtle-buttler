#!/usr/bin/env bash
set -e
# .env ファイルから環境変数を読み込む
if [ -f .env ]; then
  export $(grep -v '^[[:space:]]*#' .env | xargs)
fi

# 自動的にCloud Build SAメールアドレスを設定
if [ -z "${CLOUD_BUILD_SA_EMAIL}" ]; then
  echo "CLOUD_BUILD_SA_EMAIL が未設定のため自動設定します..."
  if [ -z "${PROJECT_ID}" ]; then
    PROJECT_ID=$(gcloud config get-value project)
  fi
  PROJECT_NUMBER=$(gcloud projects describe "${PROJECT_ID}" --format="value(projectNumber)")
  CLOUD_BUILD_SA_EMAIL="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
fi

#
# GCP Secret Manager の初期セットアップスクリプト (Mac bash v3 対応版)
# 実行前に以下の環境変数を設定してください:
#   PROJECT_ID
#   CLOUD_BUILD_SA_EMAIL (通常: $PROJECT_NUMBER@cloudbuild.gserviceaccount.com)
#   FIREBASE_URL, FIREBASE_API_KEY, SPREADSHEET_ID, CO_API_KEY, CHANNEL_ACCESS, CHANNEL_SECRET
#   credentials-admin.json をプロジェクト直下に配置
#

# シークレット名リスト
secret_names=(
  FIREBASE_URL
  FIREBASE_API_KEY
  SPREADSHEET_ID
  CO_API_KEY
  CHANNEL_ACCESS
  CHANNEL_SECRET
  CREDENTIALS_ADMIN
)

secret_values=(
  "$FIREBASE_URL"
  "$FIREBASE_API_KEY"
  "$SPREADSHEET_ID"
  "$CO_API_KEY"
  "$CHANNEL_ACCESS"
  "$CHANNEL_SECRET"
  "$CREDENTIALS_ADMIN"
)

for idx in "${!secret_names[@]}"; do
  name="${secret_names[idx]}"
  value="${secret_values[idx]}"

  if ! gcloud secrets describe "$name" >/dev/null 2>&1; then
    echo "Creating secret: $name"
    echo -n "$value" | gcloud secrets create "$name" --data-file=-
  else
    echo "Adding new version to secret: $name"
    echo -n "$value" | gcloud secrets versions add "$name" --data-file=-
  fi

  echo "Granting Secret Accessor to Cloud Build SA on: $name"
  gcloud secrets add-iam-policy-binding "$name" \
    --member="serviceAccount:${CLOUD_BUILD_SA_EMAIL}" \
    --role="roles/secretmanager.secretAccessor"
done

echo "All secrets created/updated and IAM bindings applied."

# Cloud Run サービスへの管理者権限付与
echo "Granting Cloud Run Admin to Cloud Build SA on service: ${PROJECT_ID}/asia-northeast1/kame-buttler"
gcloud run services add-iam-policy-binding kame-buttler \
  --project="${PROJECT_ID}" \
  --region="asia-northeast1" \
  --platform="managed" \
  --member="serviceAccount:${CLOUD_BUILD_SA_EMAIL}" \
  --role="roles/run.admin"

# Compute Engine デフォルトSA に Cloud Run 管理者権限を付与
echo "Granting Cloud Run Admin to Compute Engine default SA on service: ${PROJECT_ID}/asia-northeast1/kame-buttler"
gcloud run services add-iam-policy-binding kame-buttler \
  --project="${PROJECT_ID}" \
  --region="asia-northeast1" \
  --platform="managed" \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/run.admin"

# Compute Engine デフォルトSA への Token Creator 権限は
# プロジェクトレベルの IAM バインディングで付与済みのためスキップします。
echo "Compute Engine default SA Token Creator binding is handled at project level."
