require('dotenv').config();
const BackpackAPI = require('./backpack');
const logger = require('./logger');

// 从环境变量获取 API 密钥
const apiKey = process.env.BACKPACK_API_KEY;
const apiSecret = process.env.BACKPACK_API_SECRET;

if (!apiKey || !apiSecret) {
  logger.error('请在 .env 文件中设置 BACKPACK_API_KEY 和 BACKPACK_API_SECRET');
  process.exit(1);
}

const api = new BackpackAPI(apiKey, apiSecret);

async function testAllAPIs() {
  try {
    // 测试公共 API
    logger.info('测试公共 API...');
    
    // 测试获取资产列表
    const assets = await api.getAssets();
    logger.info('资产列表:', assets);

    // 测试获取市场列表
    const markets = await api.getMarkets();
    logger.info('市场列表:', markets);

    // 测试获取市场行情
    const ticker = await api.getTicker({ symbol: 'BTC_USDC' });
    logger.info('市场行情:', ticker);

    // 测试获取市场深度
    const depth = await api.getDepth({ symbol: 'BTC_USDC' });
    logger.info('市场深度:', depth);

    // 测试获取K线数据
    const klines = await api.getKlines({ 
      symbol: 'BTC_USDC',
      interval: '1h',
      limit: 10
    });
    logger.info('K线数据:', klines);

    // 测试获取系统状态
    const status = await api.getStatus();
    logger.info('系统状态:', status);

    // 测试连接
    const ping = await api.ping();
    logger.info('连接测试:', ping);

    // 测试获取服务器时间
    const time = await api.getTime();
    logger.info('服务器时间:', time);

    // 测试获取最近成交
    const recentTrades = await api.getRecentTrades({ 
      symbol: 'BTC_USDC',
      limit: 10
    });
    logger.info('最近成交:', recentTrades);

    // 测试获取历史成交
    const historicalTrades = await api.getHistoricalTrades({ 
      symbol: 'BTC_USDC',
      limit: 10
    });
    logger.info('历史成交:', historicalTrades);

    // 测试私有 API
    logger.info('测试私有 API...');

    // 测试获取账户余额
    const balance = await api.getBalance();
    logger.info('账户余额:', balance);

    // 测试获取充值记录
    const deposits = await api.getDeposits({ limit: 10 });
    logger.info('充值记录:', deposits);

    // 测试获取充值地址
    const depositAddress = await api.getDepositAddress({ 
      symbol: 'BTC',
      blockchain: 'Bitcoin'
    });
    logger.info('充值地址:', depositAddress);

    // 测试获取提现记录
    const withdrawals = await api.getWithdrawals({ limit: 10 });
    logger.info('提现记录:', withdrawals);

    // 测试获取订单历史
    const orderHistory = await api.getOrderHistory({ limit: 10 });
    logger.info('订单历史:', orderHistory);

    // 测试获取成交历史
    const fillHistory = await api.getFillHistory({ limit: 10 });
    logger.info('成交历史:', fillHistory);

    // 测试获取未完成订单
    const openOrders = await api.getOpenOrders({ limit: 10 });
    logger.info('未完成订单:', openOrders);

    // 测试获取订单详情
    if (openOrders && openOrders.length > 0) {
      const order = await api.getOrder(openOrders[0].id, openOrders[0].symbol);
      logger.info('订单详情:', order);
    }

    // 测试执行订单（市价单）
    const marketOrder = await api.executeOrder({
      symbol: 'BTC_USDC',
      side: 'Bid',
      orderType: 'Market',
      quantity: '0.001'
    });
    logger.info('市价单执行结果:', marketOrder);

    // 测试执行订单（限价单）
    const limitOrder = await api.executeOrder({
      symbol: 'BTC_USDC',
      side: 'Ask',
      orderType: 'Limit',
      price: '50000',
      quantity: '0.001',
      timeInForce: 'GTC'
    });
    logger.info('限价单执行结果:', limitOrder);

    // 测试取消订单
    if (limitOrder && limitOrder.id) {
      const cancelResult = await api.cancelOrder({
        orderId: limitOrder.id,
        symbol: 'BTC_USDC'
      });
      logger.info('取消订单结果:', cancelResult);
    }

    // 测试取消所有未完成订单
    const cancelAllResult = await api.cancelOpenOrders({
      symbol: 'BTC_USDC',
      orderType: 'RestingLimitOrder'
    });
    logger.info('取消所有订单结果:', cancelAllResult);

    // 测试获取现货K线数据
    const spotKlines = await api.getSpotKlines('BTC_USDC', '1h', 10);
    logger.info('现货K线数据:', spotKlines);

    logger.info('所有 API 测试完成');
  } catch (error) {
    logger.error('API 测试失败:', error);
  }
}

// 运行测试
testAllAPIs(); 