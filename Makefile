# GCP シークレットのセットアップを実行するターゲット
setup:
	bash scripts/setup_gcp.sh

# Cloud Build を使用してアプリケーションをデプロイするターゲット
deploy:
	gcloud config set project turtle-buttler
	gcloud builds submit --config=cloudbuild.yaml .

# MCP server のデプロイ
deploy-mcp:
	bash scripts/deploy_mcp_services.sh

# すべてのサービスをデプロイするターゲット
deploy-all: setup
	bash scripts/deploy_mcp_services.sh
	gcloud config set project turtle-buttler
	gcloud builds submit --config=cloudbuild.yaml .
