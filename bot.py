import os
import json
import time
import subprocess
from ccxt import backpack
from telegram import Bot
from telegram.error import TelegramError

CONFIG_FILE = 'config.json'
PM2_NAME = 'backpack_bot'

class BackpackBot:
    def __init__(self):
        self.config = self.load_config()
        self.exchange = None
        self.tg_bot = None
        
    def load_config(self):
        if os.path.exists(CONFIG_FILE):
            with open(CONFIG_FILE) as f:
                return json.load(f)
        return {'tg_chat_id': '', 'api_key': '', 'api_secret': ''}

    def save_config(self):
        with open(CONFIG_FILE, 'w') as f:
            json.dump(self.config, f)

    def init_exchange(self):
        self.exchange = backpack({
            'apiKey': self.config['api_key'],
            'secret': self.config['api_secret'],
            'enableRateLimit': True
        })
        self.exchange.load_markets()

    def send_tg_msg(self, msg):
        if self.config['tg_chat_id'] and self.config.get('tg_token'):
            try:
                self.tg_bot = Bot(token=self.config['tg_token'])
                self.tg_bot.send_message(chat_id=self.config['tg_chat_id'], text=msg)
            except TelegramError as e:
                print(f"Telegram error: {e}")

    def check_balance(self):
        balance = self.exchange.fetch_balance()
        return balance['free']['ETH']

    def trade_logic(self):
        last_stop_loss = 0
        while True:
            try:
                if time.time() - last_stop_loss < 1800:
                    continue

                eth_balance = self.check_balance()
                amount = eth_balance * 10  # 10x leverage

                # Place market buy order
                order = self.exchange.create_market_buy_order('ETH/USD', amount)
                entry_price = order['average']
                
                # Calculate take profit and stop loss
                take_profit = entry_price * 1.02
                stop_loss = entry_price * 0.90

                # Monitor position
                while True:
                    ticker = self.exchange.fetch_ticker('ETH/USD')
                    current_price = ticker['last']

                    if current_price >= take_profit:
                        # Place limit sell order
                        self.exchange.create_limit_sell_order('ETH/USD', amount, take_profit)
                        self.send_tg_msg(f"Profit target hit. Sold ETH at {take_profit}")
                        break
                        
                    elif current_price <= stop_loss:
                        # Place market sell order for stop loss
                        self.exchange.create_market_sell_order('ETH/USD', amount)
                        self.send_tg_msg(f"Stop loss triggered. Sold ETH at {current_price}")
                        last_stop_loss = time.time()
                        break

                    time.sleep(60)

            except Exception as e:
                self.send_tg_msg(f"Error occurred: {str(e)}")
                time.sleep(60)

    def show_menu(self):
        while True:
            print("\nBackpack Trading Bot Menu:")
            print("1. Configure Telegram")
            print("2. Configure Exchange API")
            print("3. Start Trading Bot")
            print("4. Stop Trading Bot")
            print("5. Delete Trading Bot")
            print("6. Exit")
            
            choice = input("Enter your choice: ")
            
            if choice == '1':
                self.config['tg_token'] = '7685502184:AAGxaIdwiTr0WpPDeIGmc9fgbdeSKxgXtEw'
                self.config['tg_chat_id'] = input("Enter your Telegram Chat ID: ")
                self.save_config()
                
            elif choice == '2':
                self.config['api_key'] = input("Enter API Key: ")
                self.config['api_secret'] = input("Enter API Secret: ")
                self.save_config()
                
            elif choice == '3':
                self.init_exchange()
                subprocess.run(f"pm2 start {__file__} --name {PM2_NAME} --interpreter python3", shell=True)
                self.trade_logic()
                
            elif choice == '4':
                subprocess.run(f"pm2 stop {PM2_NAME}", shell=True)
                
            elif choice == '5':
                subprocess.run(f"pm2 delete {PM2_NAME}", shell=True)
                
            elif choice == '6':
                exit()
                
            else:
                print("Invalid choice. Try again.")

if __name__ == "__main__":
    bot = BackpackBot()
    bot.show_menu()
