#!/bin/bash

# 设置工作目录
WORK_DIR="$HOME/backpack_bot"
CONFIG_FILE="$WORK_DIR/config.json"

# 清理旧环境
echo "🔄 清理旧环境..."
rm -rf "$WORK_DIR/venv"
pm2 delete backpack_bot >/dev/null 2>&1

# 创建工作目录
echo "📁 创建工作目录: $WORK_DIR"
mkdir -p "$WORK_DIR"
cd "$WORK_DIR" || exit

# 安装系统依赖
echo "🔧 安装系统依赖..."
sudo apt-get update
sudo apt-get install -y python3 python3-pip nodejs npm git jq python3-venv

# 创建虚拟环境
echo "🐍 创建Python虚拟环境..."
python3 -m venv venv

# 下载必要文件
echo "📥 下载脚本文件..."
files=("bot.py" "menu.py" "requirements.txt" "strategies.py")
for file in "${files[@]}"; do
    if ! curl -sLO "https://raw.githubusercontent.com/yinghao888/backpack/main/$file"; then
        echo "❌ 文件下载失败: $file"
        exit 1
    fi
done

# 安装Python依赖
echo "📦 安装Python依赖..."
source venv/bin/activate
pip install --upgrade pip >/dev/null
pip install -r requirements.txt > pip_install.log 2>&1

if [ $? -ne 0 ]; then
    echo "❌ Python依赖安装失败，请检查pip_install.log"
    exit 1
fi

# 初始化配置
if [ ! -f "$CONFIG_FILE" ]; then
    echo "⚙️ 创建默认配置文件..."
    cat > "$CONFIG_FILE" <<EOL
{
    "tg_chat_id": "",
    "api_key": "",
    "api_secret": "",
    "strategy": "contract",
    "grid_params": {
        "grid_num": 5,
        "upper_price": 3000,
        "lower_price": 2500,
        "grid_type": "long"
    }
}
EOL
fi

# 修复权限
echo "🔒 设置文件权限..."
chmod 755 "$WORK_DIR" -R
sudo chown -R $(whoami):$(whoami) "$WORK_DIR"

# 启动菜单
echo "✅ 安装完成！启动控制菜单..."
source venv/bin/activate
python menu.py
