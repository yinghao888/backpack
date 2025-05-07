import os
import json
import time
import hmac
import hashlib
import requests
from ccxt import Exchange
from telegram import Bot
from telegram.error import TelegramError

# 配置日志
class Logger:
    def __init__(self):
        self.format = '%(asctime)s - %(levelname)s - %(message)s'
    
    def info(self, message):
        print(f"[INFO] {time.strftime('%Y-%m-%d %H:%M:%S')} - {message}")
    
    def error(self, message):
        print(f"[ERROR] {time.strftime('%Y-%m-%d %H:%M:%S')} - {message}")

logger = Logger()

class BackpackExchange(Exchange):
    describe = {
        'id': 'backpack',
        'name': 'Backpack',
        'countries': ['VG'],
        'version': 'v1',
        'rateLimit': 1000,
        'has': {
            'fetchBalance': True,
            'createOrder': True,
            'fetchTicker': True,
        },
        'urls': {
            'api': {
                'public': 'https://api.backpack.exchange/api',
                'private': 'https://api.backpack.exchange/api',
            },
        },
        'requiredCredentials': {
            'apiKey': True,
            'secret': True,
        },
        'api': {
            'public': {
                'get': [
                    'ticker',
                ],
            },
            'private': {
                'get': [
                    'capital',
                ],
                'post': [
                    'order',
                ],
                'delete': [
                    'order',
                ],
            },
        },
    }

    def sign(self, path, api='public', method='GET', params={}, headers=None, body=None):
        timestamp = str(int(time.time() * 1000))
        signature_payload = f"{timestamp}\n{method}\n{path}\n".encode('utf-8')
        
        if method in ['POST', 'DELETE']:
            signature_payload += json.dumps(params).encode('utf-8')
        
        signature = hmac.new(
            self.secret.encode('utf-8'),
            signature_payload,
            hashlib.sha256
        ).hexdigest()

        return {
            'url': self.urls['api'][api] + '/' + path,
            'method': method,
            'headers': {
                'X-API-KEY': self.apiKey,
                'X-TIMESTAMP': timestamp,
                'X-SIGNATURE': signature,
                'Content-Type': 'application/json'
            },
            'body': json.dumps(params) if method in ['POST', 'DELETE'] else None
        }

    def fetch_balance(self, params={}):
        response = self.privateGetCapital(params)
        return self.parse_balance(response)

    def parse_balance(self, response):
        result = {'free': {}, 'used': {}, 'total': {}}
        for currency in response:
            code = currency['asset'].upper()
            result['free'][code] = float(currency['free'])
            result['total'][code] = float(currency['total'])
        return result

    def fetch_ticker(self, symbol, params={}):
        market = self.market(symbol)
        response = self.publicGetTicker({'symbol': market['id']})
        return self.parse_ticker(response, market)

    def parse_ticker(self, ticker, market):
        return {
            'symbol': market['symbol'],
            'last': float(ticker['lastPrice']),
            'bid': float(ticker['bestBid']),
            'ask': float(ticker['bestAsk']),
            'high': float(ticker['high']),
            'low': float(ticker['low']),
            'volume': float(ticker['volume']),
        }

    def create_market_buy_order(self, symbol, amount, params={}):
        return self.create_order(symbol, 'market', 'buy', amount, None, params)

    def create_order(self, symbol, type, side, amount, price=None, params={}):
        market = self.market(symbol)
        order = {
            'symbol': market['id'],
            'side': side.upper(),
            'orderType': type.upper(),
            'quantity': str(amount),
        }
        response = self.privatePostOrder(order)
        return self.parse_order(response, market)

    def parse_order(self, order, market):
        return {
            'id': order['orderId'],
            'symbol': market['symbol'],
            'amount': float(order['quantity']),
            'filled': float(order['filled']),
            'average': float(order['averagePrice']),
            'status': order['status'].lower(),
        }

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
        exchange = BackpackExchange({
            'apiKey': self.config['api_key'],
            'secret': self.config['api_secret'],
            'enableRateLimit': True,
            'options': {
                'adjustForTimeDifference': True,
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
                # 策略逻辑保持不变...
                # 原有交易策略代码
                
            except Exception as e:
                logger.error(f"交易出错: {str(e)}")
                time.sleep(60)

if __name__ == "__main__":
    bot = BackpackTradingBot()
    bot.send_telegram("🤖 交易机器人已启动")
    bot.run_strategy()
