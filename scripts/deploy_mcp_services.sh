#!/usr/bin/env bash
set -e

PROJECT_ID=$(gcloud config get-value project)
REGION="asia-northeast1"

echo "Deploying user-profile-service..."
gcloud builds submit --config cloudbuild_user_profile.yaml .

USER_PROFILE_SERVICE_URL=$(gcloud run services describe user-profile-service \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --platform="managed" \
  --format="value(status.url)")

echo "User Profile Service URL: ${USER_PROFILE_SERVICE_URL}"

# USER_PROFILE_SERVICE_URL の保存
if ! gcloud secrets describe USER_PROFILE_SERVICE_URL >/dev/null 2>&1; then
  echo "Creating secret: USER_PROFILE_SERVICE_URL"
  echo -n "${USER_PROFILE_SERVICE_URL}" | gcloud secrets create USER_PROFILE_SERVICE_URL --data-file=-
else
  echo "Adding new version to secret: USER_PROFILE_SERVICE_URL"
  echo -n "${USER_PROFILE_SERVICE_URL}" | gcloud secrets versions add USER_PROFILE_SERVICE_URL --data-file=-
fi

echo "Deploying rakuten-server..."
gcloud builds submit --config cloudbuild_rakuten.yaml .

RAKUTEN_SERVER_URL=$(gcloud run services describe rakuten-server \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --platform="managed" \
  --format="value(status.url)")

echo "Rakuten Server URL: ${RAKUTEN_SERVER_URL}"

# RAKUTEN_SERVER_URL の保存
if ! gcloud secrets describe RAKUTEN_SERVER_URL >/dev/null 2>&1; then
  echo "Creating secret: RAKUTEN_SERVER_URL"
  echo -n "${RAKUTEN_SERVER_URL}" | gcloud secrets create RAKUTEN_SERVER_URL --data-file=-
else
  echo "Adding new version to secret: RAKUTEN_SERVER_URL"
  echo -n "${RAKUTEN_SERVER_URL}" | gcloud secrets versions add RAKUTEN_SERVER_URL --data-file=-
fi

echo "MCP services deployed and URLs saved to Secret Manager."
