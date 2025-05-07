import os
import json
import subprocess
from time import sleep

CONFIG_FILE = 'config.json'
PM2_NAME = 'backpack_bot'

class TradingMenu:
    def __init__(self):
        self.check_config()
    
    def check_config(self):
        if not os.path.exists(CONFIG_FILE):
            with open(CONFIG_FILE, 'w') as f:
                json.dump({
                    'tg_chat_id': '',
                    'api_key': '',
                    'api_secret': '',
                    'strategy': 'contract',
                    'grid_params': {
                        'grid_num': 5,
                        'upper_price': 3000,
                        'lower_price': 2500,
                        'grid_type': 'long'
                    }
                }, f)

    def show_menu(self):
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
            print("1. 配置通知和API")
            print("2. 选择交易策略")
            print("3. 启动交易机器人")
            print("4. 停止交易机器人")
            print("5. 查看实时日志")
            print("6. 退出系统")
            
            choice = input("\n请选择操作 (1-6): ")
            
            if choice == '1':
                self.config_settings()
            elif choice == '2':
                self.select_strategy()
            elif choice == '3':
                self.start_bot()
            elif choice == '4':
                self.stop_bot()
            elif choice == '5':
                self.show_logs()
            elif choice == '6':
                exit()
            else:
                print("无效输入！")
                sleep(1)

    def select_strategy(self):
        os.system('clear')
        with open(CONFIG_FILE, 'r') as f:
            config = json.load(f)
        
        print("【选择交易策略】")
        print(f"当前策略: {config['strategy'].upper()}")
        print("1. 合约做多做空策略")
        print("2. 网格交易策略")
        
        choice = input("请选择策略类型 (1-2): ")
        
        if choice == '2':
            self.config_grid_strategy()
            config['strategy'] = 'grid'
        else:
            config['strategy'] = 'contract'
        
        with open(CONFIG_FILE, 'w') as f:
            json.dump(config, f, indent=4)
        print("✅ 策略设置已更新！")
        sleep(1)

    def config_grid_strategy(self):
        os.system('clear')
        with open(CONFIG_FILE, 'r') as f:
            config = json.load(f)
        
        print("【网格策略配置】")
        print("1. 做多网格")
        print("2. 做空网格")
        print("3. 中性网格")
        grid_type = input("选择网格类型 (1-3): ")
        
        config['grid_params'].update({
            'grid_num': int(input("网格数量 (默认5): ") or 5),
            'upper_price': float(input("价格上限: ")),
            'lower_price': float(input("价格下限: ")),
            'grid_type': ['long', 'short', 'neutral'][int(grid_type)-1]
        })
        
        with open(CONFIG_FILE, 'w') as f:
            json.dump(config, f, indent=4)
        print("✅ 网格参数已配置！")
        sleep(1)

    # 其他方法保持不变...
