import os
import json
import time
import hmac
import hashlib
import requests
from telegram import Bot
from telegram.error import TelegramError
from strategies import GridTrading

class BackpackTradingBot:
    def __init__(self):
        self.config = self.load_config()
        self.exchange = self.init_exchange()
        self.tg_bot = None
        self.strategy = self.init_strategy()

    def load_config(self):
        with open('config.json') as f:
            return json.load(f)

    def init_exchange(self):
        # Backpack交易所API实现（保持之前的完整实现）
        pass

    def init_strategy(self):
        if self.config['strategy'] == 'grid':
            return GridTrading(
                grid_num=self.config['grid_params']['grid_num'],
                upper_price=self.config['grid_params']['upper_price'],
                lower_price=self.config['grid_params']['lower_price'],
                grid_type=self.config['grid_params']['grid_type'],
                exchange=self.exchange
            )
        else:
            # 原有合约策略
            pass

    def run(self):
        self.strategy.execute()

if __name__ == "__main__":
    bot = BackpackTradingBot()
    bot.run()
