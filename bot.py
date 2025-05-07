import os
import json
import time
import hmac
import hashlib
import requests
from telegram import Bot
from telegram.error import TelegramError

class BackpackTradingBot:
    def __init__(self):
        self.config = self.load_config()
        self.exchange = self.init_exchange()
        self.tg_bot = None
        self.last_stop_loss = 0

    def load_config(self):
        with open('config.json') as f:
            return json.load(f)

    def init_exchange(self):
        # Backpack交易所API实现
        # ... (保留您之前的完整Backpack交易所实现代码)
        pass

    def send_telegram(self, message):
        if self.config['tg_chat_id']:
            try:
                if not self.tg_bot:
                    self.tg_bot = Bot(token="7685502184:AAGxaIdwiTr0WpPDeIGmc9fgbdeSKxgXtEw")
                self.tg_bot.send_message(chat_id=self.config['tg_chat_id'], text=message)
            except TelegramError as e:
                print(f"Telegram发送失败: {e}")

    def run_strategy(self):
        # ... (保留您之前的完整交易策略代码)
        pass

if __name__ == "__main__":
    bot = BackpackTradingBot()
    bot.send_telegram("🤖 交易机器人已启动")
    bot.run_strategy()
