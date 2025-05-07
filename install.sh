#!/bin/bash
sudo apt-get update
sudo apt-get install -y python3 python3-pip nodejs npm
sudo npm install pm2 -g
pip3 install -r requirements.txt
chmod +x bot.py
pm2 start bot.py --name backpack_bot
pm2 save
pm2 startup
python3 bot.py
