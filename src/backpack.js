const crypto = require('crypto');
const axios = require('axios');
const logger = require('./logger');
const nacl = require('tweetnacl');
const { decodeBase64 } = require('tweetnacl-util');
const { HttpsProxyAgent } = require('https-proxy-agent');

const DEFAULT_TIMEOUT_MS = 5000;
const BASE_URL = process.env.BACKPACK_API_URL || 'https://api.backpack.exchange';

const instructions = {
  public: new Map([
    ['assets', { url: `${BASE_URL}/api/v1/assets`, method: 'GET' }],
    ['markets', { url: `${BASE_URL}/api/v1/markets`, method: 'GET' }],
    ['ticker', { url: `${BASE_URL}/api/v1/ticker`, method: 'GET' }],
    ['depth', { url: `${BASE_URL}/api/v1/depth`, method: 'GET' }],
    ['klines', { url: `${BASE_URL}/api/v1/klines`, method: 'GET' }],
    ['status', { url: `${BASE_URL}/api/v1/status`, method: 'GET' }],
    ['ping', { url: `${BASE_URL}/api/v1/ping`, method: 'GET' }],
    ['time', { url: `${BASE_URL}/api/v1/time`, method: 'GET' }],
    ['trades', { url: `${BASE_URL}/api/v1/trades`, method: 'GET' }],
    ['tradesHistory', { url: `${BASE_URL}/api/v1/trades/history`, method: 'GET' }]
  ]),
  private: new Map([
    ['balanceQuery', { url: `${BASE_URL}/api/v1/capital`, method: 'GET' }],
    ['depositAddressQuery', { url: `${BASE_URL}/wapi/v1/capital/deposit/address`, method: 'GET' }],
    ['depositQueryAll', { url: `${BASE_URL}/wapi/v1/capital/deposits`, method: 'GET' }],
    ['fillHistoryQueryAll', { url: `${BASE_URL}/wapi/v1/history/fills`, method: 'GET' }],
    ['orderCancel', { url: `${BASE_URL}/api/v1/order`, method: 'DELETE' }],
    ['orderCancelAll', { url: `${BASE_URL}/api/v1/orders`, method: 'DELETE' }],
    ['orderExecute', { url: `${BASE_URL}/api/v1/order`, method: 'POST' }],
    ['orderHistoryQueryAll', { url: `${BASE_URL}/wapi/v1/history/orders`, method: 'GET' }],
    ['orderQuery', { url: `${BASE_URL}/api/v1/order`, method: 'GET' }],
    ['orderQueryAll', { url: `${BASE_URL}/api/v1/orders`, method: 'GET' }],
    ['withdraw', { url: `${BASE_URL}/wapi/v1/capital/withdrawals`, method: 'POST' }],
    ['withdrawalQueryAll', { url: `${BASE_URL}/wapi/v1/capital/withdrawals`, method: 'GET' }]
  ])
};

// 将 base64 私钥转换为 PKCS8 DER 格式
const toPkcs8der = (rawB64) => {
  const rawPrivate = Buffer.from(rawB64, 'base64').subarray(0, 32);
  const prefixPrivateEd25519 = Buffer.from('302e020100300506032b657004220420', 'hex');
  const der = Buffer.concat([prefixPrivateEd25519, rawPrivate]);
  return crypto.createPrivateKey({ key: der, format: 'der', type: 'pkcs8' });
};

// 将 base64 公钥转换为 SPKI 格式
const toSpki = (rawB64) => {
  const rawPublic = Buffer.from(rawB64, 'base64');
  const prefixPublicEd25519 = Buffer.from('302a300506032b6570032100', 'hex');
  const der = Buffer.concat([prefixPublicEd25519, rawPublic]);
  return crypto.createPublicKey({ key: der, format: 'der', type: 'spki' });
};

// 生成签名
const getMessageSignature = (request, privateKey, timestamp, instruction, window = DEFAULT_TIMEOUT_MS) => {
  const message = Object.keys(request)
    .sort()
    .map(key => `${key}=${request[key]}`)
    .join('&');

  const headerInfo = { timestamp, window };
  const headerMessage = Object.keys(headerInfo)
    .sort()
    .map(key => `${key}=${headerInfo[key]}`)
    .join('&');

  const messageToSign = `instruction=${instruction}${message ? `&${message}` : ''}&${headerMessage}`;
  const signature = crypto.sign(null, Buffer.from(messageToSign), privateKey);
  return signature.toString('base64');
};

// 创建代理配置
const createProxyConfig = () => {
    const proxyConfig = {
        host: process.env.HOST,
        port: process.env.PORT,
        auth: {
            username: process.env.USER_NAME,
            password: process.env.PASSWORD
        }
    };

    const proxyUrl = `http://${proxyConfig.auth.username}:${proxyConfig.auth.password}@${proxyConfig.host}:${proxyConfig.port}`;
    return new HttpsProxyAgent(proxyUrl);
};

// 发送原始请求
const rawRequest = async (instruction, headers, data) => {
    const { url, method } = instructions.private.has(instruction)
        ? instructions.private.get(instruction)
        : instructions.public.get(instruction);

    let fullUrl = url;
    headers['User-Agent'] = 'Backpack API Client';
    headers['Content-Type'] = method === 'GET'
        ? 'application/x-www-form-urlencoded'
        : 'application/json; charset=utf-8';

    const options = { 
        headers,
        httpsAgent: createProxyConfig()
    };

    if (method === 'GET') {
        Object.assign(options, { method });
        fullUrl = url + (Object.keys(data).length > 0 ? '?' + new URLSearchParams(data).toString() : '');
    } else if (method === 'POST' || method === 'DELETE') {
        Object.assign(options, {
            method,
            data: data
        });
    }

    logger.info('发送请求:', {
        url: fullUrl,
        method,
        headers: {
            ...headers,
            'X-API-Key': '***',
            'X-Signature': '***'
        },
        data
    });

    try {
        const response = await axios(fullUrl, options);
        logger.info('收到响应:', {
            status: response.status,
            statusText: response.statusText,
            // data: response.data
        });
        return response.data;
    } catch (error) {
        logger.error('请求失败:', {
            url: fullUrl,
            method,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message
        });
        if (error.response && error.response.data) {
            throw new Error(JSON.stringify(error.response.data));
        }
        throw error;
    }
};

class BackpackAPI {
  constructor(apiKey, apiSecret, customHeaders = {}, windowMs = DEFAULT_TIMEOUT_MS) {
    if (!apiKey || !apiSecret) {
      throw new Error('API key and secret are required');
    }
    
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.customHeaders = customHeaders;
    this.windowMs = windowMs;
    
    try {
      this.privateKey = toPkcs8der(apiSecret);
      this.publicKey = toSpki(apiKey);
    } catch (error) {
      logger.error('初始化 API 密钥失败:', error);
      throw error;
    }
  }

  async api(method, params = {}) {
    try {
      if (instructions.public.has(method)) {
        return await this.publicMethod(method, params);
      } else if (instructions.private.has(method)) {
        return await this.privateMethod(method, params);
      }
    } catch (error) {
      logger.error('API 错误:', {
        method,
        url: instructions.private.has(method) ? instructions.private.get(method).url :
          (instructions.public.has(method) ? instructions.public.get(method).url : '找不到方法'),
        error: error.message,
        response: error.response?.data
      });
      throw error;
    }
    throw new Error(method + ' 不是有效的 API 方法');
  }

  async publicMethod(instruction, params = {}) {
    return await rawRequest(instruction, this.customHeaders, params);
  }

  async privateMethod(instruction, params = {}) {
    const timestamp = Date.now();
    const window = this.windowMs;
    const signature = getMessageSignature(
      params,
      this.privateKey,
      timestamp,
      instruction,
      window
    );

    const headers = {
      'X-Timestamp': timestamp,
      'X-Window': window,
      'X-API-Key': this.apiKey,
      'X-Signature': signature,
      ...this.customHeaders
    };

    console.log('发送请求:', {
      instruction,
      params,
      headers
    });

    const response = await rawRequest(instruction, headers, params);
    
    // console.log('收到响应:', response);
    
    return response;
  }

  // API 方法
  /**
   * 获取账户余额
   * @returns {Promise<{
   *   [asset: string]: {
   *     available: string,  // 可用余额
   *     locked: string,     // 锁定余额
   *     staked: string      // 质押余额
   *   }
   * }>}
   */
  async getBalance() {
    return this.api('balanceQuery');
  }

  /**
   * 获取充值记录
   * @returns {Promise<Array<{
   *   id: number,
   *   toAddress: string,
   *   fromAddress: string,
   *   confirmationBlockNumber: number,
   *   source: string,
   *   status: string,
   *   transactionHash: string,
   *   symbol: string,
   *   quantity: string,
   *   createdAt: string
   * }>>}
   */
  async getDeposits(params = {}) {
    return this.api('depositQueryAll', params);
  }

  /**
   * 获取充值地址
   * @returns {Promise<{
   *   address: string
   * }>}
   */
  async getDepositAddress(params) {
    return this.api('depositAddressQuery', params);
  }

  /**
   * 获取提现记录
   * @returns {Promise<Array<{
   *   id: number,
   *   blockchain: string,
   *   clientId: string,
   *   identifier: string,
   *   quantity: string,
   *   fee: string,
   *   symbol: string,
   *   status: string,
   *   subaccountId: number,
   *   toAddress: string,
   *   transactionHash: string,
   *   createdAt: string,
   *   isInternal: boolean
   * }>>}
   */
  async getWithdrawals(params = {}) {
    return this.api('withdrawalQueryAll', params);
  }

  /**
   * 提交提现请求
   * @param {{
   *   address: string,
   *   blockchain: string,
   *   clientId: string,
   *   quantity: string,
   *   symbol: string,
   *   twoFactorToken: string,
   *   autoBorrow?: boolean,
   *   autoLendRedeem?: boolean
   * }} params
   * @returns {Promise<{
   *   id: number,
   *   blockchain: string,
   *   clientId: string,
   *   identifier: string,
   *   quantity: string,
   *   fee: string,
   *   symbol: string,
   *   status: string,
   *   subaccountId: number,
   *   toAddress: string,
   *   transactionHash: string,
   *   createdAt: string,
   *   isInternal: boolean
   * }>}
   */
  async withdraw(params) {
    return this.api('withdraw', params);
  }

  /**
   * 获取订单历史
   * @returns {Promise<Array<{
   *   id: string,
   *   createdAt: string,
   *   executedQuantity: string,
   *   executedQuoteQuantity: string,
   *   expiryReason: string,
   *   orderType: string,
   *   postOnly: boolean,
   *   price: string,
   *   quantity: string,
   *   quoteQuantity: string,
   *   selfTradePrevention: string,
   *   status: string,
   *   side: string,
   *   stopLossTriggerPrice: string,
   *   stopLossLimitPrice: string,
   *   stopLossTriggerBy: string,
   *   symbol: string,
   *   takeProfitTriggerPrice: string,
   *   takeProfitLimitPrice: string,
   *   takeProfitTriggerBy: string,
   *   timeInForce: string,
   *   triggerBy: string,
   *   triggerPrice: string,
   *   triggerQuantity: string
   * }>>}
   */
  async getOrderHistory(params = {}) {
    return this.api('orderHistoryQueryAll', params);
  }

  /**
   * 获取成交历史
   * @returns {Promise<Array<{
   *   clientId: string,
   *   fee: string,
   *   feeSymbol: string,
   *   isMaker: boolean,
   *   orderId: string,
   *   price: string,
   *   quantity: string,
   *   side: string,
   *   symbol: string,
   *   systemOrderType: string,
   *   timestamp: string,
   *   tradeId: number
   * }>>}
   */
  async getFillHistory(params = {}) {
    return this.api('fillHistoryQueryAll', params);
  }

  /**
   * 获取资产列表
   * @returns {Promise<Array<{
   *   symbol: string,
   *   tokens: Array<{
   *     blockchain: string,
   *     contractAddress: string,
   *     depositEnabled: boolean,
   *     minimumDeposit: string,
   *     withdrawEnabled: boolean,
   *     minimumWithdrawal: string,
   *     maximumWithdrawal: string,
   *     withdrawalFee: string
   *   }>
   * }>>}
   */
  async getAssets() {
    return this.api('assets');
  }

  /**
   * 获取市场列表
   * @returns {Promise<Array<{
   *   symbol: string,
   *   baseSymbol: string,
   *   quoteSymbol: string,
   *   marketType: string,
   *   filters: {
   *     price: {
   *       minPrice: string,
   *       maxPrice: string,
   *       tickSize: string,
   *       maxMultiplier: string,
   *       minMultiplier: string,
   *       maxImpactMultiplier: string,
   *       minImpactMultiplier: string,
   *       meanMarkPriceBand: {
   *         maxMultiplier: string,
   *         minMultiplier: string
   *       },
   *       meanPremiumBand: {
   *         tolerancePct: string
   *       },
   *       borrowEntryFeeMaxMultiplier: string,
   *       borrowEntryFeeMinMultiplier: string
   *     },
   *     quantity: {
   *       minQuantity: string,
   *       maxQuantity: string,
   *       stepSize: string
   *     }
   *   },
   *   imfFunction: {
   *     type: string,
   *     base: string,
   *     factor: string
   *   },
   *   mmfFunction: {
   *     type: string,
   *     base: string,
   *     factor: string
   *   },
   *   fundingInterval: number,
   *   openInterestLimit: string,
   *   orderBookState: string,
   *   createdAt: string
   * }>>}
   */
  async getMarkets() {
    return this.api('markets');
  }

  /**
   * 获取市场行情
   * @param {Object} params 请求参数
   * @param {string} params.symbol 交易对
   * @returns {Promise<{
   *   symbol: string,
   *   firstPrice: string,
   *   lastPrice: string,
   *   priceChange: string,
   *   priceChangePercent: string,
   *   high: string,
   *   low: string,
   *   volume: string,
   *   quoteVolume: string,
   *   trades: string
   * }>}
   */
  async getTicker(params) {
    return this.api('ticker', params);
  }

  /**
   * 获取市场深度
   * @returns {Promise<{
   *   asks: Array<[string, string]>,  // [price, quantity]
   *   bids: Array<[string, string]>,  // [price, quantity]
   *   lastUpdateId: string,
   *   timestamp: number
   * }>}
   */
  async getDepth(params) {
    return this.api('depth', params);
  }

  /**
   * 获取K线数据
   * @param {Object} params 请求参数
   * @param {string} params.symbol 交易对
   * @param {string} params.interval 时间间隔
   * @param {number} params.limit 获取数量
   * @param {number} params.startTime 开始时间
   * @returns {Promise<Array<{
   *   openTime: number,
   *   open: string,
   *   high: string,
   *   low: string,
   *   close: string,
   *   volume: string,
   *   closeTime: number,
   *   quoteVolume: string,
   *   trades: number,
   *   takerBaseVolume: string,
   *   takerQuoteVolume: string,
   *   ignore: string
   * }>>}
   */
  async getSpotKlines(symbol, interval = '1m', limit = 100) {
    const params = {
      symbol,
      interval,
      limit,
      startTime: Math.floor(Date.now() / 1000) - limit * (this.intervalMs[interval] || 60)
    };
    return this.getKlines(params);
  }

  /**
   * 现货下单
   * @param {string} symbol 交易对
   * @param {string} action 交易方向 (buy/sell)
   * @param {number} amount 交易数量
   * @returns {Promise<{
   *   orderId: string,
   *   status: string
   * }>}
   */
  async placeSpotOrder(symbol, action, amount) {
    const params = {
      symbol,
      side: action.toUpperCase(),
      orderType: 'MARKET',
      quantity: amount.toString()
    };
    return this.executeOrder(params);
  }

  /**
   * 获取订单详情
   * @param {string} orderId 订单ID
   * @param {string} symbol 交易对
   * @returns {Promise<{
   *   orderType: string,
   *   id: string,
   *   clientId: number,
   *   createdAt: number,
   *   executedQuantity: string,
   *   executedQuoteQuantity: string,
   *   postOnly: boolean,
   *   price: string,
   *   quantity: string,
   *   reduceOnly: boolean,
   *   selfTradePrevention: string,
   *   status: string,
   *   stopLossTriggerPrice: string,
   *   stopLossLimitPrice: string,
   *   stopLossTriggerBy: string,
   *   side: string,
   *   symbol: string,
   *   takeProfitTriggerPrice: string,
   *   takeProfitLimitPrice: string,
   *   takeProfitTriggerBy: string,
   *   timeInForce: string,
   *   triggerBy: string,
   *   triggerPrice: string,
   *   triggerQuantity: string,
   *   triggeredAt: number,
   *   relatedOrderId: string
   * }>}
   */
  async getOrder(orderId, symbol) {
    const orders = await this.api('orderHistoryQueryAll', { orderId, symbol });
    return Array.isArray(orders) && orders.length > 0 ? orders[0] : null;
  }

  /**
   * 执行订单
   * @param {{
   *   autoLend?: boolean,
   *   autoLendRedeem?: boolean,
   *   autoBorrow?: boolean,
   *   autoBorrowRepay?: boolean,
   *   clientId?: number,
   *   orderType: string,
   *   postOnly?: boolean,
   *   price?: string,
   *   quantity?: string,
   *   quoteQuantity?: string,
   *   reduceOnly?: boolean,
   *   selfTradePrevention?: string,
   *   side: string,
   *   stopLossLimitPrice?: string,
   *   stopLossTriggerPrice?: string,
   *   symbol: string,
   *   takeProfitLimitPrice?: string,
   *   takeProfitTriggerPrice?: string,
   *   timeInForce?: string,
   *   triggerPrice?: string,
   *   triggerQuantity?: string
   * }} params
   * @returns {Promise<{
   *   orderType: string,
   *   id: string,
   *   clientId: number,
   *   createdAt: number,
   *   executedQuantity: string,
   *   executedQuoteQuantity: string,
   *   postOnly: boolean,
   *   price: string,
   *   quantity: string,
   *   reduceOnly: boolean,
   *   selfTradePrevention: string,
   *   status: string,
   *   stopLossTriggerPrice: string,
   *   stopLossLimitPrice: string,
   *   stopLossTriggerBy: string,
   *   side: string,
   *   symbol: string,
   *   takeProfitTriggerPrice: string,
   *   takeProfitLimitPrice: string,
   *   takeProfitTriggerBy: string,
   *   timeInForce: string,
   *   triggerBy: string,
   *   triggerPrice: string,
   *   triggerQuantity: string,
   *   triggeredAt: number,
   *   relatedOrderId: string
   * }>}
   */
  async executeOrder(params) {
    return this.api('orderExecute', params);
  }

  /**
   * 取消订单
   * @param {{
   *   clientId: number,
   *   orderId: string,
   *   symbol: string
   * }} params
   * @returns {Promise<{
   *   orderType: string,
   *   id: string,
   *   clientId: number,
   *   createdAt: number,
   *   executedQuantity: string,
   *   executedQuoteQuantity: string,
   *   quantity: string,
   *   quoteQuantity: string,
   *   reduceOnly: boolean,
   *   timeInForce: string,
   *   selfTradePrevention: string,
   *   side: string,
   *   status: string,
   *   stopLossTriggerPrice: string,
   *   stopLossLimitPrice: string,
   *   stopLossTriggerBy: string,
   *   symbol: string,
   *   takeProfitTriggerPrice: string,
   *   takeProfitLimitPrice: string,
   *   takeProfitTriggerBy: string,
   *   triggerBy: string,
   *   triggerPrice: string,
   *   triggerQuantity: string,
   *   triggeredAt: number,
   *   relatedOrderId: string
   * }>}
   */
  async cancelOrder(params) {
    return this.api('orderCancel', params);
  }

  /**
   * 获取未完成订单
   * @returns {Promise<Array<{
   *   orderType: string,
   *   id: string,
   *   clientId: number,
   *   createdAt: number,
   *   executedQuantity: string,
   *   executedQuoteQuantity: string,
   *   quantity: string,
   *   quoteQuantity: string,
   *   reduceOnly: boolean,
   *   timeInForce: string,
   *   selfTradePrevention: string,
   *   side: string,
   *   status: string,
   *   stopLossTriggerPrice: string,
   *   stopLossLimitPrice: string,
   *   stopLossTriggerBy: string,
   *   symbol: string,
   *   takeProfitTriggerPrice: string,
   *   takeProfitLimitPrice: string,
   *   takeProfitTriggerBy: string,
   *   triggerBy: string,
   *   triggerPrice: string,
   *   triggerQuantity: string,
   *   triggeredAt: number,
   *   relatedOrderId: string
   * }>>}
   */
  async getOpenOrders(params = {}) {
    return this.api('orderQueryAll', params);
  }

  /**
   * 取消所有未完成订单
   * @param {{
   *   symbol: string,
   *   orderType: string
   * }} params
   * @returns {Promise<Array<{
   *   orderType: string,
   *   id: string,
   *   clientId: number,
   *   createdAt: number,
   *   executedQuantity: string,
   *   executedQuoteQuantity: string,
   *   quantity: string,
   *   quoteQuantity: string,
   *   reduceOnly: boolean,
   *   timeInForce: string,
   *   selfTradePrevention: string,
   *   side: string,
   *   status: string,
   *   stopLossTriggerPrice: string,
   *   stopLossLimitPrice: string,
   *   stopLossTriggerBy: string,
   *   symbol: string,
   *   takeProfitTriggerPrice: string,
   *   takeProfitLimitPrice: string,
   *   takeProfitTriggerBy: string,
   *   triggerBy: string,
   *   triggerPrice: string,
   *   triggerQuantity: string,
   *   triggeredAt: number,
   *   relatedOrderId: string
   * }>>}
   */
  async cancelOpenOrders(params) {
    return this.api('orderCancelAll', params);
  }

  /**
   * 获取系统状态
   * @returns {Promise<{
   *   status: string,
   *   message: string
   * }>}
   */
  async getStatus() {
    return this.api('status');
  }

  /**
   * 测试连接
   * @returns {Promise<{
   *   ping: number
   * }>}
   */
  async ping() {
    return this.api('ping');
  }

  /**
   * 获取服务器时间
   * @returns {Promise<{
   *   serverTime: string
   * }>}
   */
  async getTime() {
    return this.api('time');
  }

  /**
   * 获取最近成交
   * @returns {Promise<Array<{
   *   id: number,
   *   price: string,
   *   quantity: string,
   *   quoteQuantity: string,
   *   timestamp: number,
   *   isBuyerMaker: boolean
   * }>>}
   */
  async getRecentTrades(params) {
    return this.api('trades', params);
  }

  /**
   * 获取历史成交
   * @returns {Promise<Array<{
   *   id: number,
   *   price: string,
   *   quantity: string,
   *   quoteQuantity: string,
   *   timestamp: number,
   *   isBuyerMaker: boolean
   * }>>}
   */
  async getHistoricalTrades(params) {
    return this.api('tradesHistory', params);
  }

  // 定义时间间隔映射
  intervalMs = {
    '1m': 60,
    '5m': 300,
    '15m': 900,
    '30m': 1800,
    '1h': 3600,
    '4h': 14400,
    '1d': 86400
  };

  async getKlines({ symbol, interval = '1m', limit = 100}) {
    try {
      const endTime = Math.floor(Date.now() / 1000);
      const startTime = endTime - (limit * this.intervalMs[interval] || 3600);

      const response = await this.api('klines', {
        symbol,
        interval,
        limit,
        startTime,
        endTime
      });
      return response;
    } catch (error) {
      logger.error('获取K线数据失败:', error);
      throw error;
    }
  }
}

module.exports = BackpackAPI;