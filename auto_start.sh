#!/bin/bash
# 自动检测并安装依赖
if ! command -v python3 &>/dev/null; then
    sudo apt-get install -y python3 python3-pip
fi

if ! command -v pm2 &>/dev/null; then
    sudo npm install pm2 -g
fi

# 安装Python依赖
pip3 install -r requirements.txt

# 启动菜单系统
python3 menu.py
