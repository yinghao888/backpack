#!/bin/bash

cd "$(dirname "$0")/.."

# 检查是否已安装
if [ ! -f config.json ] || [ ! -d venv ]; then
    echo "❌ Please run install.sh first!"
    exit 1
fi

# 启动机器人
echo "🤖 Starting Backpack Trading Bot..."
pm2 start bot.py --name backpack_bot --interpreter python3

# 显示日志
echo "📜 Showing logs..."
pm2 logs backpack_bot
