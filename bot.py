import os
import json
import time
import logging
from ccxt import backpack
from telegram import Bot
from telegram.error import TelegramError

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

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
        exchange = backpack({
            'apiKey': self.config['api_key'],
            'secret': self.config['api_secret'],
            'enableRateLimit': True,
            'options': {
                'defaultType': 'swap'
            }
        })
        exchange.load_markets()
        return exchange

    def send_telegram(self, message):
        if self.config['tg_chat_id']:
            try:
                if not self.tg_bot:
                    self.tg_bot = Bot(token="7685502184:AAGxaIdwiTr0WpPDeIGmc9fgbdeSKxgXtEw")
                self.tg_bot.send_message(chat_id=self.config['tg_chat_id'], text=message)
            except TelegramError as e:
                logger.error(f"Telegram发送失败: {e}")

    def run_strategy(self):
        while True:
            try:
                # 检查冷静期
                if time.time() - self.last_stop_loss < 1800:
                    logger.info("处于止损冷静期，等待中...")
                    time.sleep(60)
                    continue

                # 获取余额
                balance = self.exchange.fetch_balance()
                usd_balance = balance['free']['USD']
                logger.info(f"当前余额: {usd_balance} USD")

                # 计算开仓量 (10倍杠杆)
                amount = (usd_balance * 10) / self.exchange.fetch_ticker('ETH/USD')['last']
                logger.info(f"计划开仓量: {amount:.4f} ETH")

                # 市价开多
                order = self.exchange.create_market_buy_order('ETH/USD', amount)
                entry_price = order['average']
                logger.info(f"开仓成功! 均价: {entry_price}")

                # 设置止盈止损
                take_profit = entry_price * 1.02
                stop_loss = entry_price * 0.90
                logger.info(f"止盈: {take_profit:.2f} | 止损: {stop_loss:.2f}")

                # 监控仓位
                while True:
                    ticker = self.exchange.fetch_ticker('ETH/USD')
                    current_price = ticker['last']

                    if current_price >= take_profit:
                        # 限价止盈
                        self.exchange.create_limit_sell_order('ETH/USD', amount, take_profit)
                        msg = f"💰 止盈平仓 | 价格: {take_profit:.2f}"
                        logger.info(msg)
                        self.send_telegram(msg)
                        break

                    elif current_price <= stop_loss:
                        # 市价止损
                        self.exchange.create_market_sell_order('ETH/USD', amount)
                        msg = f"⚠️ 止损平仓 | 价格: {current_price:.2f}"
                        logger.info(msg)
                        self.send_telegram(msg)
                        self.last_stop_loss = time.time()
                        break

                    time.sleep(15)

            except Exception as e:
                logger.error(f"交易出错: {str(e)}")
                time.sleep(60)

if __name__ == "__main__":
    bot = BackpackTradingBot()
    bot.send_telegram("🤖 交易机器人已启动")
    bot.run_strategy()
