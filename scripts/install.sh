#!/bin/bash

# 安装依赖
echo "🛠  Installing dependencies..."
sudo apt-get update
sudo apt-get install -y python3 python3-pip nodejs npm git

# 安装PM2
echo "⏳ Installing PM2..."
sudo npm install pm2 -g

# 克隆仓库
echo "📦 Cloning repository..."
git clone https://github.com/yinghao888/backpack.git
cd backpack

# 安装Python依赖
echo "🐍 Installing Python packages..."
pip3 install -r requirements.txt

# 创建配置文件
if [ ! -f config.json ]; then
    echo "⚙️  Creating default config file..."
    cat > config.json <<EOL
{
    "tg_chat_id": "",
    "api_key": "",
    "api_secret": ""
}
EOL
fi

echo "✅ Installation completed!"
echo "👉 Run the bot with: ./scripts/run.sh"
