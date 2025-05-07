#!/bin/bash

# 中文字符设置
export LANG=zh_CN.UTF-8

echo "🔍 正在检测系统环境..."

# 检测并安装必要依赖
install_dependencies() {
    echo "🛠️ 正在检查并安装系统依赖..."
    
    # 检测Python3
    if ! command -v python3 &> /dev/null; then
        echo "🐍 未找到Python3，正在安装..."
        sudo apt-get install -y python3
    fi
    
    # 检测pip3
    if ! command -v pip3 &> /dev/null; then
        echo "📦 未找到pip3，正在安装..."
        sudo apt-get install -y python3-pip
    fi
    
    # 检测Node.js
    if ! command -v node &> /dev/null; then
        echo "🟢 未找到Node.js，正在安装..."
        sudo apt-get install -y nodejs npm
    fi
    
    # 检测PM2
    if ! command -v pm2 &> /dev/null; then
        echo "⏳ 正在安装PM2..."
        sudo npm install pm2 -g
    fi
}

# 安装Python依赖
install_python_packages() {
    echo "🐍 正在检查Python依赖..."
    pip3 install -r requirements.txt
}

# 配置检查
check_config() {
    if [ ! -f "config.json" ]; then
        echo "⚙️ 正在创建默认配置文件..."
        cat > config.json <<EOL
{
    "tg_chat_id": "请输入您的Telegram Chat ID",
    "api_key": "请输入Backpack API Key",
    "api_secret": "请输入Backpack API Secret"
}
EOL
        echo "❌ 请先编辑config.json文件配置您的API信息！"
        exit 1
    fi
}

# 启动机器人
start_bot() {
    echo "🤖 正在启动交易机器人..."
    
    # 检查是否已在运行
    if pm2 list | grep -q "backpack_bot"; then
        echo "🔄 机器人已经在运行，正在重启..."
        pm2 restart backpack_bot
    else
        pm2 start bot.py --name backpack_bot --interpreter python3
    fi
    
    # 设置开机自启
    pm2 save
    pm2 startup | grep -v "sudo" | bash
    
    echo "✅ 机器人已成功启动！"
    echo "📜 正在显示日志（Ctrl+C退出日志查看不影响机器人运行）..."
    pm2 logs backpack_bot
}

# 主流程
main() {
    # 进入脚本所在目录
    cd "$(dirname "$0")" || exit
    
    # 安装依赖
    install_dependencies
    install_python_packages
    
    # 检查配置
    check_config
    
    # 启动机器人
    start_bot
}

main
