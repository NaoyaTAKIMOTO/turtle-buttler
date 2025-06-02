# GCP シークレットのセットアップを実行するターゲット
setup:
	bash scripts/setup_gcp.sh

# Cloud Build を使用してアプリケーションをデプロイするターゲット
deploy:
	gcloud config set project turtle-buttler
	gcloud builds submit --config=cloudbuild.yaml .
