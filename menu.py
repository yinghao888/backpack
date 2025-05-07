import os
import json
import time
import subprocess
from ccxt import Exchange
import hmac
import hashlib
import requests
from telegram import Bot
from telegram.error import TelegramError

# 配置文件路径
CONFIG_FILE = 'config.json'
PM2_NAME = 'backpack_bot'

class BackpackTradingSystem:
    def __init__(self):
        self.config = self.load_config()
        self.exchange = None
        self.tg_bot = None
        
    def load_config(self):
        """加载配置文件"""
        if os.path.exists(CONFIG_FILE):
            with open(CONFIG_FILE) as f:
                return json.load(f)
        return {'tg_chat_id': '', 'api_key': '', 'api_secret': ''}

    def save_config(self):
        """保存配置文件"""
        with open(CONFIG_FILE, 'w') as f:
            json.dump(self.config, f, indent=4)

    def show_menu(self):
        """显示主菜单"""
        while True:
            os.system('clear')
            print("""
            ██████╗  █████╗  ██████╗██╗  ██╗██████╗  █████╗  ██████╗██╗  ██╗
            ██╔══██╗██╔══██╗██╔════╝██║ ██╔╝██╔══██╗██╔══██╗██╔════╝██║ ██╔╝
            ██████╔╝███████║██║     █████╔╝ ██████╔╝███████║██║     █████╔╝ 
            ██╔══██╗██╔══██║██║     ██╔═██╗ ██╔═══╝ ██╔══██║██║     ██╔═██╗ 
            ██████╔╝██║  ██║╚██████╗██║  ██╗██║     ██║  ██║╚██████╗██║  ██╗
            ╚═════╝ ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝     ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
            """)
            print("【Backpack 智能交易系统】")
            print("1. 配置 Telegram 通知")
            print("2. 配置交易所 API")
            print("3. 启动交易策略")
            print("4. 停止交易策略")
            print("5. 查看实时日志")
            print("6. 删除所有配置")
            print("7. 退出系统")
            choice = input("\n请选择操作 (1-7): ")

            if choice == '1':
                self.config_telegram()
            elif choice == '2':
                self.config_api()
            elif choice == '3':
                self.start_trading()
            elif choice == '4':
                self.stop_trading()
            elif choice == '5':
                self.show_logs()
            elif choice == '6':
                self.clean_config()
            elif choice == '7':
                print("感谢使用，再见！")
                exit()
            else:
                print("无效输入，请重新选择！")
                time.sleep(1)

    def config_telegram(self):
        """配置Telegram通知"""
        os.system('clear')
        print("【Telegram 通知配置】")
        print(f"当前Chat ID: {self.config.get('tg_chat_id', '未配置')}")
        
        new_id = input("请输入新的Telegram Chat ID（直接回车跳过）: ").strip()
        if new_id:
            self.config['tg_chat_id'] = new_id
            self.save_config()
            print("✅ 配置已更新！")
        else:
            print("⚠️ 未修改配置")
        input("\n按回车键返回主菜单...")

    def config_api(self):
        """配置交易所API"""
        os.system('clear')
        print("【交易所 API 配置】")
        print(f"当前API Key: {self.config.get('api_key', '未配置')[:6]}...")
        
        api_key = input("请输入API Key: ").strip()
        api_secret = input("请输入API Secret: ").strip()
        
        if api_key and api_secret:
            self.config.update({
                'api_key': api_key,
                'api_secret': api_secret
            })
            self.save_config()
            print("✅ API配置已更新！")
        else:
            print("❌ 输入不完整，配置未修改")
        input("\n按回车键返回主菜单...")

    def start_trading(self):
        """启动交易策略"""
        os.system('clear')
        print("【启动交易策略】")
        
        # 检查必要配置
        if not all([self.config.get('api_key'), self.config.get('api_secret')]):
            print("❌ 请先配置API信息！")
            time.sleep(2)
            return

        # 使用PM2启动进程
        try:
            subprocess.run(f"pm2 start bot.py --name {PM2_NAME} --interpreter python3", 
                         shell=True, check=True)
            print("✅ 交易策略已启动")
            print("提示：可以使用 'pm2 logs' 查看详细日志")
        except subprocess.CalledProcessError as e:
            print(f"❌ 启动失败: {str(e)}")
        
        input("\n按回车键返回主菜单...")

    def stop_trading(self):
        """停止交易策略"""
        os.system('clear')
        print("【停止交易策略】")
        subprocess.run(f"pm2 stop {PM2_NAME}", shell=True)
        print("✅ 交易策略已停止")
        input("\n按回车键返回主菜单...")

    def show_logs(self):
        """查看实时日志"""
        os.system('clear')
        print("【实时日志查看】")
        print("正在显示日志（Ctrl+C退出）...\n")
        subprocess.run(f"pm2 logs {PM2_NAME} --lines 100", shell=True)
        input("\n按回车键返回主菜单...")

    def clean_config(self):
        """清除所有配置"""
        os.system('clear')
        print("【危险操作】将会删除：")
        print("- 所有配置文件")
        print("- PM2进程记录")
        print("- 交易策略数据\n")
        
        confirm = input("确定要删除所有配置吗？(y/N): ").lower()
        if confirm == 'y':
            try:
                # 删除配置文件
                if os.path.exists(CONFIG_FILE):
                    os.remove(CONFIG_FILE)
                
                # 删除PM2进程
                subprocess.run(f"pm2 delete {PM2_NAME}", shell=True)
                subprocess.run("pm2 save", shell=True)
                
                print("✅ 所有配置已清除！")
            except Exception as e:
                print(f"❌ 清除失败: {str(e)}")
        else:
            print("⚠️ 已取消操作")
        
        input("\n按回车键返回主菜单...")

if __name__ == "__main__":
    # 首次运行检查
    if not os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'w') as f:
            json.dump({'tg_chat_id': '', 'api_key': '', 'api_secret': ''}, f)
    
    # 启动菜单系统
    system = BackpackTradingSystem()
    system.show_menu()
