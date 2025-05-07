#!/bin/bash

# 设置中文字符
export LANG=zh_CN.UTF-8

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 主菜单函数
show_menu() {
    clear
    echo -e "${YELLOW}==================================${NC}"
    echo -e "${GREEN}    Backpack 交易机器人控制中心    ${NC}"
    echo -e "${YELLOW}==================================${NC}"
    echo -e "1. ${BLUE}安装系统依赖${NC}"
    echo -e "2. ${BLUE}配置Telegram通知${NC}"
    echo -e "3. ${BLUE}配置交易所API${NC}"
    echo -e "4. ${BLUE}启动交易机器人${NC}"
    echo -e "5. ${BLUE}停止交易机器人${NC}"
    echo -e "6. ${BLUE}查看运行状态${NC}"
    echo -e "7. ${BLUE}查看运行日志${NC}"
    echo -e "8. ${BLUE}卸载机器人${NC}"
    echo -e "0. ${RED}退出${NC}"
    echo -e "${YELLOW}==================================${NC}"
}

# 安装系统依赖
install_dependencies() {
    echo -e "${GREEN}🛠️ 正在检查系统依赖...${NC}"
    
    # 检测并安装Python3
    if ! command -v python3 &> /dev/null; then
        echo -e "${YELLOW}🐍 未找到Python3，正在安装...${NC}"
        sudo apt-get update && sudo apt-get install -y python3
    else
        echo -e "${GREEN}✓ Python3 已安装${NC}"
    fi
    
    # 检测并安装pip3
    if ! command -v pip3 &> /dev/null; then
        echo -e "${YELLOW}📦 未找到pip3，正在安装...${NC}"
        sudo apt-get install -y python3-pip
    else
        echo -e "${GREEN}✓ pip3 已安装${NC}"
    fi
    
    # 检测并安装Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${YELLOW}🟢 未找到Node.js，正在安装...${NC}"
        sudo apt-get install -y nodejs npm
    else
        echo -e "${GREEN}✓ Node.js 已安装${NC}"
    fi
    
    # 检测并安装PM2
    if ! command -v pm2 &> /dev/null; then
        echo -e "${YELLOW}⏳ 正在安装PM2...${NC}"
        sudo npm install pm2 -g
    else
        echo -e "${GREEN}✓ PM2 已安装${NC}"
    fi
    
    # 安装Python包
    if [ -f "requirements.txt" ]; then
        echo -e "${YELLOW}🐍 正在安装Python依赖...${NC}"
        pip3 install -r requirements.txt
    else
        echo -e "${RED}❌ 未找到requirements.txt文件${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ 所有依赖安装完成！${NC}"
    read -p "按回车键返回主菜单..."
}

# 配置Telegram
config_telegram() {
    clear
    echo -e "${YELLOW}📱 Telegram通知配置${NC}"
    
    # 读取现有配置
    if [ -f "config.json" ]; then
        current_id=$(jq -r '.tg_chat_id' config.json 2>/dev/null || echo "")
    else
        current_id=""
    fi
    
    read -p "请输入您的Telegram Chat ID [$current_id]: " tg_id
    tg_id=${tg_id:-$current_id}
    
    # 写入配置
    if [ ! -f "config.json" ]; then
        echo "{}" > config.json
    fi
    
    # 使用jq修改JSON文件
    if ! command -v jq &> /dev/null; then
        echo -e "${YELLOW}正在安装jq工具...${NC}"
        sudo apt-get install -y jq
    fi
    
    jq --arg id "$tg_id" '.tg_chat_id = $id' config.json > temp.json && mv temp.json config.json
    
    echo -e "${GREEN}✅ Telegram配置已保存！${NC}"
    read -p "按回车键返回主菜单..."
}

# 配置交易所API
config_exchange() {
    clear
    echo -e "${YELLOW}🏦 交易所API配置${NC}"
    
    # 读取现有配置
    if [ -f "config.json" ]; then
        current_key=$(jq -r '.api_key' config.json 2>/dev/null || echo "")
        current_secret=$(jq -r '.api_secret' config.json 2>/dev/null || echo "")
    else
        current_key=""
        current_secret=""
    fi
    
    read -p "请输入API Key [$current_key]: " api_key
    api_key=${api_key:-$current_key}
    
    read -p "请输入API Secret [$current_secret]: " api_secret
    api_secret=${api_secret:-$current_secret}
    
    # 写入配置
    if [ ! -f "config.json" ]; then
        echo "{}" > config.json
    fi
    
    jq --arg key "$api_key" --arg secret "$api_secret" \
       '.api_key = $key | .api_secret = $secret' config.json > temp.json && mv temp.json config.json
    
    echo -e "${GREEN}✅ 交易所API配置已保存！${NC}"
    read -p "按回车键返回主菜单..."
}

# 启动机器人
start_bot() {
    clear
    echo -e "${YELLOW}🤖 正在启动交易机器人...${NC}"
    
    # 检查配置文件
    if [ ! -f "config.json" ]; then
        echo -e "${RED}❌ 未找到配置文件，请先配置API信息！${NC}"
        read -p "按回车键返回主菜单..."
        return
    fi
    
    # 检查Python脚本
    if [ ! -f "bot.py" ]; then
        echo -e "${RED}❌ 未找到bot.py主程序文件！${NC}"
        read -p "按回车键返回主菜单..."
        return
    fi
    
    # 使用PM2启动
    if pm2 list | grep -q "backpack_bot"; then
        echo -e "${BLUE}🔄 机器人已经在运行，正在重启...${NC}"
        pm2 restart backpack_bot
    else
        pm2 start bot.py --name backpack_bot --interpreter python3
    fi
    
    # 设置开机自启
    pm2 save
    pm2 startup | grep -v "sudo" | bash
    
    echo -e "${GREEN}✅ 机器人已启动成功！${NC}"
    echo -e "使用 ${BLUE}pm2 logs backpack_bot${NC} 查看日志"
    echo -e "使用 ${BLUE}pm2 list${NC} 查看运行状态"
    read -p "按回车键返回主菜单..."
}

# 停止机器人
stop_bot() {
    clear
    echo -e "${YELLOW}🛑 正在停止交易机器人...${NC}"
    
    if pm2 list | grep -q "backpack_bot"; then
        pm2 stop backpack_bot
        echo -e "${GREEN}✅ 机器人已停止！${NC}"
    else
        echo -e "${BLUE}ℹ️ 机器人当前没有运行${NC}"
    fi
    
    read -p "按回车键返回主菜单..."
}

# 查看状态
show_status() {
    clear
    echo -e "${YELLOW}📊 机器人运行状态${NC}"
    pm2 list | grep "backpack_bot"
    echo -e "\n${YELLOW}最近10条日志：${NC}"
    pm2 logs backpack_bot --lines 10 --raw --nostream
    read -p "按回车键返回主菜单..."
}

# 查看日志
show_logs() {
    clear
    echo -e "${YELLOW}📜 实时日志 (Ctrl+C退出)${NC}"
    pm2 logs backpack_bot --raw --nostream
    read -p "按回车键返回主菜单..."
}

# 卸载机器人
uninstall_bot() {
    clear
    echo -e "${RED}⚠️ 即将卸载交易机器人${NC}"
    read -p "确定要卸载吗？这将停止并删除所有相关进程！(y/n) " confirm
    
    if [[ $confirm =~ ^[Yy]$ ]]; then
        # 停止并删除PM2进程
        if pm2 list | grep -q "backpack_bot"; then
            pm2 delete backpack_bot
        fi
        
        # 删除PM2持久化
        pm2 save
        pm2 unstartup
        
        echo -e "${GREEN}✅ 机器人已卸载完成！${NC}"
    else
        echo -e "${BLUE}ℹ️ 已取消卸载操作${NC}"
    fi
    
    read -p "按回车键返回主菜单..."
}

# 主循环
while true; do
    show_menu
    read -p "请输入选项数字: " choice
    
    case $choice in
        1) install_dependencies ;;
        2) config_telegram ;;
        3) config_exchange ;;
        4) start_bot ;;
        5) stop_bot ;;
        6) show_status ;;
        7) show_logs ;;
        8) uninstall_bot ;;
        0) 
            echo -e "${GREEN}👋 再见！${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ 无效选项，请重新输入！${NC}"
            sleep 1
            ;;
    esac
done
