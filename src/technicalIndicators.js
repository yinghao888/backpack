const logger = require('./logger');
const config = require('./config');

class TechnicalIndicators {
    // 计算价格波动率
    static calculateVolatility(prices) {
        const returns = [];
        for (let i = 1; i < prices.length; i++) {
            returns.push((prices[i] - prices[i-1]) / prices[i-1]);
        }
        const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length;
        return Math.sqrt(variance) * 100;
    }

    // 计算RSI
    static calculateRSI(prices, period = 14) {
        if (prices.length < period + 1) return 50;
        
        let gains = 0;
        let losses = 0;
        
        for (let i = 1; i <= period; i++) {
            const difference = prices[i] - prices[i - 1];
            if (difference >= 0) {
                gains += difference;
            } else {
                losses -= difference;
            }
        }
        
        const avgGain = gains / period;
        const avgLoss = losses / period;
        
        if (avgLoss === 0) return 100;
        
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    // 计算MACD
    static calculateMACD(prices, fastPeriod = config.MACD_FAST_PERIOD, slowPeriod = config.MACD_SLOW_PERIOD, signalPeriod = config.MACD_SIGNAL_PERIOD) {
        logger.info('开始计算MACD');
        logger.info(`输入参数 - 快线周期: ${fastPeriod}, 慢线周期: ${slowPeriod}, 信号线周期: ${signalPeriod}`);
        logger.info(`输入价格数组长度: ${prices.length}`);
        
        // 确保所有价格都是数字
        const numericPrices = prices.map(p => parseFloat(p));
        const minPrice = Math.min(...numericPrices);
        const maxPrice = Math.max(...numericPrices);
        logger.info(`价格范围: ${minPrice} 至 ${maxPrice}`);
        
        // 如果数据不足，返回默认值
        if (numericPrices.length < slowPeriod) {
            logger.info(`数据点数量不足，需要至少 ${slowPeriod} 个数据点`);
            return { macd: 0, signal: 0, histogram: 0 };
        }

        // 计算快线EMA
        const fastEMAArray = this.calculateEMAArray(numericPrices, fastPeriod);
        const fastEMA = fastEMAArray[fastEMAArray.length - 1];
        logger.info(`快线EMA: ${fastEMA}`);
        
        // 计算慢线EMA
        const slowEMAArray = this.calculateEMAArray(numericPrices, slowPeriod);
        const slowEMA = slowEMAArray[slowEMAArray.length - 1];
        logger.info(`慢线EMA: ${slowEMA}`);
        
        // 计算MACD线
        const macd = fastEMA - slowEMA;
        logger.info(`MACD线: ${macd}`);
        
        // 计算MACD的历史值用于计算信号线
        const macdArray = [];
        for (let i = 0; i < fastEMAArray.length; i++) {
            const slow = slowEMAArray[i] || slowEMA;
            macdArray.push(fastEMAArray[i] - slow);
        }
        logger.info(`MACD历史值数组长度: ${macdArray.length}`);
        
        // 计算信号线
        const signalArray = this.calculateEMAArray(macdArray, signalPeriod);
        const signal = signalArray[signalArray.length - 1];
        logger.info(`信号线: ${signal}`);
        
        // 计算MACD柱状图
        const histogram = macd - signal;
        logger.info(`MACD柱状图: ${histogram}`);

        const result = {
            macd: parseFloat(macd.toFixed(8)),
            signal: parseFloat(signal.toFixed(8)),
            histogram: parseFloat(histogram.toFixed(8))
        };
        logger.info('MACD计算结果:', JSON.stringify(result, null, 2));

        return result;
    }

    // 计算EMA数组
    static calculateEMAArray(prices, period) {
        if (prices.length < period) {
            logger.info('EMA计算 - 数据不足，返回原始数组');
            return prices;
        }

        const k = 2 / (period + 1);
        const emaArray = [];
        
        // 计算第一个EMA值（使用SMA）
        let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
        emaArray.push(ema);
        
        // 计算剩余的EMA值
        for (let i = period; i < prices.length; i++) {
            ema = (prices[i] - ema) * k + ema;
            emaArray.push(ema);
        }

        logger.info('EMA计算完成，数组长度:', emaArray.length);
        return emaArray;
    }

    // 计算布林带
    static calculateBollingerBands(prices, period = 20, stdDev = 2) {
        if (prices.length < period) {
            return { upper: null, middle: null, lower: null };
        }

        // 计算简单移动平均线(SMA)
        const sma = prices.slice(-period).reduce((a, b) => a + parseFloat(b), 0) / period;
        
        // 计算标准差
        const squaredDiffs = prices.slice(-period).map(price => 
            Math.pow(parseFloat(price) - sma, 2)
        );
        const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
        const standardDeviation = Math.sqrt(variance);

        return {
            upper: parseFloat((sma + (standardDeviation * stdDev)).toFixed(8)),
            middle: parseFloat(sma.toFixed(8)),
            lower: parseFloat((sma - (standardDeviation * stdDev)).toFixed(8))
        };
    }

    // 计算趋势
    static calculateTrend(prices) {
        if (prices.length < 2) return 0;
        const firstPrice = prices[0];
        const lastPrice = prices[prices.length - 1];
        return ((lastPrice - firstPrice) / firstPrice) * 100;
    }

    // 计算支撑位和阻力位
    static calculateSupportResistance(prices) {
        if (prices.length < 2) {
            return { support: prices[0], resistance: prices[0] };
        }

        const sortedPrices = [...prices].sort((a, b) => a - b);
        const support = sortedPrices[0];
        const resistance = sortedPrices[sortedPrices.length - 1];

        return { support, resistance };
    }

    // 获取价格位置描述
    static getPricePosition(price, upper, lower) {
        if (price > upper) return "高于布林带上轨";
        if (price < lower) return "低于布林带下轨";
        return "在布林带内";
    }

    // 获取趋势强度描述
    static getTrendStrength(shortTerm, longTerm) {
        if (shortTerm > 0 && longTerm > 0) return "强势上涨";
        if (shortTerm < 0 && longTerm < 0) return "强势下跌";
        if (shortTerm > 0 && longTerm < 0) return "短期反弹";
        if (shortTerm < 0 && longTerm > 0) return "短期回调";
        return "横盘整理";
    }

    // 获取成交量状态描述
    static getVolumeStatus(volume, avgVolume) {
        const change = ((volume - avgVolume) / avgVolume) * 100;
        if (change > 50) return "显著放量";
        if (change > 20) return "温和放量";
        if (change < -50) return "显著缩量";
        if (change < -20) return "温和缩量";
        return "成交量平稳";
    }

    // 获取波动性状态描述
    static getVolatilityStatus(volatility) {
        if (volatility > 5) return "高波动";
        if (volatility > 2) return "中等波动";
        return "低波动";
    }
}

module.exports = TechnicalIndicators; 