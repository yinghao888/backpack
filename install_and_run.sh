#!/bin/bash

# 中文字符设置
export LANG=zh_CN.UTF-8

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

# 创建工作目录
WORK_DIR="$HOME/backpack_bot"
mkdir -p "$WORK_DIR"
cd "$WORK_DIR" || exit

echo -e "${GREEN}🌟 Backpack全自动交易机器人安装程序${NC}"

# 安装系统依赖
echo -e "${YELLOW}🔧 正在安装系统依赖...${NC}"
sudo apt-get update
sudo apt-get install -y python3 python3-pip nodejs npm git jq

# 安装PM2
echo -e "${YELLOW}⏳ 正在安装PM2...${NC}"
sudo npm install pm2 -g

# 下载必要文件
echo -e "${YELLOW}📦 正在下载脚本文件...${NC}"
files=("bot.py" "menu.py" "requirements.txt" "strategies.py")
for file in "${files[@]}"; do
    curl -sO "https://raw.githubusercontent.com/yinghao888/backpack/main/$file"
done

# 安装Python依赖
echo -e "${YELLOW}🐍 正在安装Python依赖...${NC}"
pip3 install -r requirements.txt

# 初始化配置文件
if [ ! -f "config.json" ]; then
    echo -e "${YELLOW}⚙️ 正在创建配置文件...${NC}"
    cat > config.json <<EOL
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

# 启动菜单系统
echo -e "${GREEN}✅ 安装完成！启动控制菜单...${NC}"
python3 menu.py
