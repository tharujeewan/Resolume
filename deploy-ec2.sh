#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "============================================="
echo "        EventWall EC2 Deployment Script      "
echo "============================================="

# 1. Update system packages
echo "Updating system repositories..."
sudo apt-get update -y
sudo apt-get upgrade -y

# 2. Install Docker
if ! [ -x "$(command -v docker)" ]; then
  echo "Installing Docker..."
  sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update -y
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io
  
  # Start and enable Docker service
  sudo systemctl start docker
  sudo systemctl enable docker
  
  # Add current user to the docker group
  sudo usermod -aG docker $USER
  echo "Docker installed successfully."
else
  echo "Docker is already installed."
fi

# 3. Install Docker Compose
if ! [ -x "$(command -v docker-compose)" ] && ! docker compose version &>/dev/null; then
  echo "Installing Docker Compose..."
  sudo mkdir -p /usr/local/lib/docker/cli-plugins/
  sudo curl -SL "https://github.com/docker/compose/releases/download/v2.24.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/lib/docker/cli-plugins/docker-compose
  sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
  sudo ln -s /usr/local/lib/docker/cli-plugins/docker-compose /usr/local/bin/docker-compose
  echo "Docker Compose installed successfully."
else
  echo "Docker Compose is already installed."
fi

# 4. Check for .env file
if [ ! -f .env ]; then
  echo "Creating .env configuration file..."
  cat <<EOT > .env
# Environment Settings
NODE_ENV=production
PORT=5000

# Database Credentials
DATABASE_URL="postgresql://postgres:postgres@db:5432/eventwall?schema=public"

# JWT Token Configurations
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
JWT_ACCESS_EXPIRATION_MINUTES=15
JWT_REFRESH_EXPIRATION_DAYS=7

# Upload Limits
UPLOAD_DIR=/uploads
MAX_FILE_SIZE=10485760

# Domain and Security Configuration
# REPLACE WITH YOUR EC2 PUBLIC IP OR DOMAIN NAME
PUBLIC_DOMAIN="http://YOUR_EC2_PUBLIC_IP"
CORS_ORIGIN="http://YOUR_EC2_PUBLIC_IP"
EOT
  echo "A default .env file was created. IMPORTANT: Please edit .env and update PUBLIC_DOMAIN with your EC2 public IP/domain."
fi

# 5. Spin up the containers
echo "Starting multi-container Docker deployment..."
# Run docker compose up with build flag
sudo docker compose up -d --build

echo "============================================="
echo "  EventWall is deploying in the background!  "
echo "  Check container status: sudo docker ps     "
echo "  View backend startup logs: sudo docker logs -f eventwall-server"
echo "============================================="
