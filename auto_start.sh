#!/bin/bash

# 中文字符设置
export LANG=zh_CN.UTF-8

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 工作目录
WORK_DIR="$HOME/backpack_bot"
CONFIG_FILE="$WORK_DIR/config.json"
PM2_NAME="backpack_bot"

# 创建目录结构
mkdir -p "$WORK_DIR"
cd "$WORK_DIR" || exit

# 创建必要文件
create_files() {
    # requirements.txt
    if [ ! -f "requirements.txt" ]; then
        cat > requirements.txt <<EOL
ccxt==4.2.85
python-telegram-bot==20.5
requests==2.31.0
python-dotenv==1.0.0
jq==1.6
EOL
    fi

    # config.json
    if [ ! -f "config.json" ]; then
        cat > config.json <<EOL
{
    "tg_chat_id": "",
    "api_key": "",
    "api_secret": ""
}
EOL
    fi

    # bot.py
    if [ ! -f "bot.py" ]; then
        curl -sO https://raw.githubusercontent.com/yinghao888/backpack/main/bot.py
    fi
}

# 安装依赖
install_deps() {
    echo -e "${YELLOW}🔧 正在安装系统依赖...${NC}"
    sudo apt-get update
    sudo apt-get install -y python3 python3-pip nodejs npm jq
    
    echo -e "${YELLOW}📦 正在安装PM2...${NC}"
    sudo npm install pm2 -g
    
    echo -e "${YELLOW}🐍 正在安装Python包...${NC}"
    pip3 install -r requirements.txt
}

# 交互式配置
setup_config() {
    echo -e "${YELLOW}⚙️ 开始配置机器人${NC}"
    
    # Telegram配置
    read -p "请输入Telegram Chat ID: " tg_id
    jq --arg id "$tg_id" '.tg_chat_id = $id' "$CONFIG_FILE" > temp.json && mv temp.json "$CONFIG_FILE"
    
    # 交易所API配置
    read -p "请输入Backpack API Key: " api_key
    read -p "请输入Backpack API Secret: " api_secret
    
    jq --arg key "$api_key" --arg secret "$api_secret" \
       '.api_key = $key | .api_secret = $secret' "$CONFIG_FILE" > temp.json && mv temp.json "$CONFIG_FILE"
    
    echo -e "${GREEN}✅ 配置已完成${NC}"
}

# 启动机器人
start_bot() {
    echo -e "${YELLOW}🚀 正在启动机器人...${NC}"
    
    if pm2 list | grep -q "$PM2_NAME"; then
        pm2 restart "$PM2_NAME"
    else
        pm2 start bot.py --name "$PM2_NAME" --interpreter python3
    fi
    
    pm2 save
    pm2 startup | grep -v "sudo" | bash
    
    echo -e "${GREEN}🤖 机器人已启动${NC}"
    echo -e "使用 ${BLUE}pm2 logs $PM2_NAME${NC} 查看日志"
}

# 主流程
main() {
    echo -e "${GREEN}🌟 Backpack交易机器人安装程序${NC}"
    
    # 创建文件
    create_files
    
    # 安装依赖
    install_deps
    
    # 配置
    setup_config
    
    # 启动
    start_bot
    
    # 显示日志
    echo -e "\n${YELLOW}📜 开始显示日志(Ctrl+C退出)...${NC}"
    pm2 logs "$PM2_NAME"
}

main
