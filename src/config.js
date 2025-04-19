require('dotenv').config();

const config = {
    // 交易所配置
    exchange: {
        active: 'backpack'  // 固定使用 backpack
    },
    
    // 交易对配置
    tradingPairs: {
        backpack: {
            'SOL_USDC': {
                tradeAmount: 0.1,
                maxPositionSize: 1,
                stopLoss: 5,
                takeProfit: 5 
            },
            'W_USDC': {
                tradeAmount: 1,
                maxPositionSize: 10,
                stopLoss: 10,
                takeProfit: 10
            },
            'BTC_USDC': {
                tradeAmount: 0.0001,
                maxPositionSize: 0.01,
                stopLoss: 5,
                takeProfit: 5
            },
            'ETH_USDC': {
                tradeAmount: 0.01,
                maxPositionSize: 0.1,
                stopLoss: 5,
                takeProfit: 5
            },
            'LINK_USDC': {
                tradeAmount: 0.1,
                maxPositionSize: 1,
                stopLoss: 10,
                takeProfit: 10
            },
            'UNI_USDC': {
                tradeAmount: 0.1,
                maxPositionSize: 1,
                stopLoss: 5,
                takeProfit: 5
            },
            'SHIB_USDC': {
                tradeAmount: 1000,
                maxPositionSize: 10000,
                stopLoss: 10,
                takeProfit: 10
            },
            'AAVE_USDC': {
                tradeAmount: 0.1,
                maxPositionSize: 1,
                stopLoss: 5,
                takeProfit: 5
            },
            'ONDO_USDC': {
                tradeAmount: 1,
                maxPositionSize: 10,
                stopLoss: 5,
                takeProfit: 5
            },
            'TRUMP_USDC': {
                tradeAmount: 0.1,
                maxPositionSize: 1,
                stopLoss: 5,
                takeProfit: 5
            },
            'PEPE_USDC': {
                tradeAmount: 1000,
                maxPositionSize: 10000,
                stopLoss: 10,
                takeProfit: 10
            },
            'JUP_USDC': {
                tradeAmount: 0.1,
                maxPositionSize: 1,
                stopLoss: 5,
                takeProfit: 5
            },
            'MOVE_USDC': {
                tradeAmount: 0.1,
                maxPositionSize: 1,
                stopLoss: 5,
                takeProfit: 5
            },
            'WIF_USDC': {
                tradeAmount: 10,
                maxPositionSize: 100,
                stopLoss: 10,
                takeProfit: 10
            },
            'PYTH_USDC': {
                tradeAmount: 0.1,
                maxPositionSize: 1,
                stopLoss: 5,
                takeProfit: 5
            }
        }
    },

    // 系统配置
    system: {
        pollingInterval: parseInt(process.env.POLLING_INTERVAL) || 300000, // 默认5分钟
        tradeAmount: parseFloat(process.env.TRADE_AMOUNT) || 0.001,
        minTradeInterval: 300000, // 最小交易间隔（5分钟）
        analysisInterval: 60000, // 分析间隔（1分钟）
        tweetCheckInterval: 15 * 60 * 1000 // 检查推文的时间间隔（15分钟）
    },

    // 交易配置
    TRADE_AMOUNT: process.env.TRADE_AMOUNT || '0.001',
    MIN_TRADE_INTERVAL: process.env.MIN_TRADE_INTERVAL || 300000, // 5分钟
    POLLING_INTERVAL: process.env.POLLING_INTERVAL || 300000, // 5分钟
    
    // K线数据配置
    KLINE_INTERVAL: process.env.KLINE_INTERVAL || '1m', // K线间隔
    KLINE_LIMIT: process.env.KLINE_LIMIT || 300, // K线数量
    
    // 技术指标配置
    MACD_FAST_PERIOD: process.env.MACD_FAST_PERIOD || 12,
    MACD_SLOW_PERIOD: process.env.MACD_SLOW_PERIOD || 26,
    MACD_SIGNAL_PERIOD: process.env.MACD_SIGNAL_PERIOD || 9,
};

module.exports = config; 