#!/bin/bash

# 定义仓库信息
REPO_URL="https://github.com/yinghao888/backpack"
WORK_DIR="$HOME/backpack_bot"

# 清理旧环境
echo "🔄 清理旧环境..."
rm -rf "$WORK_DIR"
pm2 delete backpack_bot >/dev/null 2>&1

# 克隆仓库
echo "📥 克隆仓库..."
git clone "$REPO_URL" "$WORK_DIR"
cd "$WORK_DIR" || exit

# 安装系统依赖
echo "🔧 安装依赖..."
sudo apt-get update
sudo apt-get install -y python3 python3-pip nodejs npm git jq python3-venv

# 创建虚拟环境
echo "🐍 配置Python环境..."
python3 -m venv venv
source venv/bin/activate

# 安装Python包
echo "📦 安装Python依赖..."
pip install -r requirements.txt

# 修复权限
echo "🔒 设置权限..."
chmod -R 755 "$WORK_DIR"
sudo chown -R $(whoami):$(whoami) "$WORK_DIR"

# 启动菜单
echo "🚀 启动交易系统..."
source venv/bin/activate
python menu.py
