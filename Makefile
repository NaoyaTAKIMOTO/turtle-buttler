# GCP シークレットのセットアップを実行するターゲット
setup:
	bash infrastructure/scripts/setup_gcp.sh

# Build the main application
build:
	npm run build

# Build all applications
build-all: build
	npm run build:apps

# Cloud Build を使用してアプリケーションをデプロイするターゲット
deploy:
	gcloud config set project turtle-buttler
	gcloud builds submit --config=infrastructure/cloudbuild/cloudbuild.yaml .

# MCP server のデプロイ
deploy-mcp:
	bash infrastructure/scripts/deploy_mcp_services.sh

# Firebase Realtime Database セキュリティルールのデプロイ
deploy-db-rules:
	firebase deploy --only database --project turtle-buttler-e34e9

# 本番用セキュリティルールのデプロイ
deploy-db-rules-prod:
	cp database-rules-production.json database.rules.json
	firebase deploy --only database --project turtle-buttler-e34e9
	rm database.rules.json

# 高セキュリティルールのデプロイ
deploy-db-rules-secure:
	cp database-rules-secure.json database.rules.json
	firebase deploy --only database --project turtle-buttler-e34e9
	rm database.rules.json

# すべてのサービスをデプロイするターゲット
deploy-all: setup
	bash infrastructure/scripts/deploy_mcp_services.sh
	gcloud config set project turtle-buttler
	gcloud builds submit --config=infrastructure/cloudbuild/cloudbuild.yaml .
