// tradingRules.js

/**
 * 交易规则判断模块
 */

// 买入信号判断条件
const buyConditions = [
    // Condition 1: RSI < 40 且 MACD柱状图为正
    {
      name: "RSI超卖且MACD转正",
      condition: (data) => data.current.rsi < 40 && data.current.macd.histogram > 0
    },
    
    // Condition 2: 价格接近支撑位且成交量增加
    {
      name: "接近支撑位且放量",
      condition: (data) => {
        const priceDiff = Math.abs(data.current.price - data.current.support) / data.current.support;
        return priceDiff < 0.03 && data.current.volume > data.previous.volume;
      }
    },
    
    // Condition 3: 布林带下轨附近且趋势转正
    {
      name: "布林带下轨支撑且趋势转多",
      condition: (data) => {
        const lowerDiff = Math.abs(data.current.price - data.current.bollingerBands.lower) / data.current.bollingerBands.lower;
        return lowerDiff < 0.02 && data.current.shortTermTrend > 0 && data.previous.shortTermTrend <= 0;
      }
    },
    
    // Condition 4: MACD金叉且成交量放大
    {
      name: "MACD金叉且放量",
      condition: (data) => {
        const isGoldenCross = data.current.macd.line > data.current.macd.signal && 
                             data.previous.macd.line <= data.previous.macd.signal;
        return isGoldenCross && data.current.volume > data.previous.volume;
      }
    },
    
    // Condition 5: 连续2小时上涨且RSI < 65
    {
      name: "连续上涨且RSI未超买",
      condition: (data) => {
        const isUpTrend = data.current.price > data.previous.price && 
                         data.previous.price > data.priceBeforePrevious.price;
        return isUpTrend && data.current.rsi < 65;
      }
    },
    
    // Condition 6: 突破布林带中轨且成交量放大
    {
      name: "突破中轨且放量",
      condition: (data) => {
        const isBreakThrough = data.current.price > data.current.bollingerBands.middle &&
                              data.previous.price <= data.previous.bollingerBands.middle;
        return isBreakThrough && data.current.volume > data.previous.volume;
      }
    },
    
    // Condition 7: 短期趋势正且RSI < 60
    {
      name: "短期趋势转多且RSI未超买",
      condition: (data) => data.current.shortTermTrend > 0 && data.current.rsi < 60
    }
  ];
  
  // 卖出信号判断条件
  const sellConditions = [
    // Condition 1: RSI > 60 且 MACD柱状图为负
    {
      name: "RSI超买且MACD转负",
      condition: (data) => data.current.rsi > 60 && data.current.macd.histogram < 0
    },
    
    // Condition 2: 接近阻力位且成交量增加
    {
      name: "接近阻力位且放量",
      condition: (data) => {
        const priceDiff = Math.abs(data.current.price - data.current.resistance) / data.current.resistance;
        return priceDiff < 0.03 && data.current.volume > data.previous.volume;
      }
    },
    
    // Condition 3: 布林带上轨附近且趋势转负
    {
      name: "布林带上轨压力且趋势转空",
      condition: (data) => {
        const upperDiff = Math.abs(data.current.price - data.current.bollingerBands.upper) / data.current.bollingerBands.upper;
        return upperDiff < 0.02 && data.current.shortTermTrend < 0 && data.previous.shortTermTrend >= 0;
      }
    },
    
    // Condition 4: MACD死叉且成交量放大
    {
      name: "MACD死叉且放量",
      condition: (data) => {
        const isDeathCross = data.current.macd.line < data.current.macd.signal && 
                            data.previous.macd.line >= data.previous.macd.signal;
        return isDeathCross && data.current.volume > data.previous.volume;
      }
    },
    
    // Condition 5: 连续2小时下跌且RSI > 35
    {
      name: "连续下跌且RSI未超卖",
      condition: (data) => {
        const isDownTrend = data.current.price < data.previous.price && 
                           data.previous.price < data.priceBeforePrevious.price;
        return isDownTrend && data.current.rsi > 35;
      }
    },
    
    // Condition 6: 跌破布林带中轨且成交量放大
    {
      name: "跌破中轨且放量",
      condition: (data) => {
        const isBreakDown = data.current.price < data.current.bollingerBands.middle &&
                           data.previous.price >= data.previous.bollingerBands.middle;
        return isBreakDown && data.current.volume > data.previous.volume;
      }
    },
    
    // Condition 7: 短期趋势负且RSI > 40
    {
      name: "短期趋势转空且RSI未超卖",
      condition: (data) => data.current.shortTermTrend < 0 && data.current.rsi > 40
    }
  ];
  
  // 加分因素判断条件
  const bonusConditions = [
    // 趋势一致
    // (signal, data) => signal === 'buy' ? data.trendDirection === 'up' : data.trendDirection === 'down',
    
    // 成交量持续放大
    (signal, data) => data.current.volume > data.previous.volume && data.previous.volume > data.priceBeforePrevious.volume,
    
    // 布林带开口一致
    (signal, data) => {
      const currentWidth = data.current.bollingerBands.upper - data.current.bollingerBands.lower;
      const prevWidth = data.previous.bollingerBands.upper - data.previous.bollingerBands.lower;
      return signal === 'BUY' ? currentWidth > prevWidth : currentWidth < prevWidth;
    },
    
    // // 社交媒体情绪一致
    // (signal, data) => signal === 'buy' ? data.socialSentiment === 'positive' : data.socialSentiment === 'negative',
    
    // 突破关键价位
    (signal, data) => signal === 'BUY' ? 
      data.current.price > data.current.resistance : 
      data.current.price < data.current.support,
    
    // 波动率增加
    (signal, data) => data.current.marketVolatility > data.previous.marketVolatility
  ];
  
  /**
   * 主判断函数
   * @param {Object} data 市场数据
   * @returns {Object} 交易信号和置信度
   */
  function evaluateSignal(data) {
    const buySignal = buyConditions.some(condition => condition.condition(data));
    const sellSignal = sellConditions.some(condition => condition.condition(data));
    
    let result = {
      decision: 'HOLD',
      confidence: 0,
      reasoning: '无交易信号',
      triggeredConditions: []
    };
  
    if (buySignal && sellSignal) {
      result.decision = 'HOLD';
      result.reasoning = '买入和卖出信号同时存在，保持观望';
      return result;
    }
  
    if (buySignal) {
      const triggeredBuyConditions = buyConditions
        .map((cond, index) => ({condition: cond.name, met: cond.condition(data)}))
        .filter(item => item.met)
        .map(item => item.condition);

      result.decision = 'BUY';
      result.triggeredConditions = triggeredBuyConditions;
      result.reasoning = `触发${triggeredBuyConditions.length}个买入条件: ${triggeredBuyConditions.join(', ')}`;
    }
  
    if (sellSignal) {
      const triggeredSellConditions = sellConditions
        .map((cond, index) => ({condition: cond.name, met: cond.condition(data)}))
        .filter(item => item.met)
        .map(item => item.condition);

      result.decision = 'SELL';
      result.triggeredConditions = triggeredSellConditions;
      result.reasoning = `触发${triggeredSellConditions.length}个卖出条件: ${triggeredSellConditions.join(', ')}`;
    }
  
    if (result.decision !== 'HOLD') {
      // 计算加分因素
      const bonusPoints = bonusConditions.reduce((count, cond) => 
        count + (cond(result.decision, data) ? 1 : 0), 0);
      
      // 计算置信度 (基础条件 + 加分因素)
      result.confidence = Math.min(1, (result.triggeredConditions.length + bonusPoints) / 10);
      
      // 添加加分因素到分析理由
      if (bonusPoints > 0) {
        result.reasoning += `\n额外满足${bonusPoints}个加分条件`;
      }
    }
  
    return result;
  }
  
  module.exports = {
    evaluateSignal
  };



// 示例数据
const sampleData = {
    current: {
      price: 95,
      rsi: 35,
      macd: { line: 0.5, signal: 0.3, histogram: 0.2 },
      bollingerBands: { upper: 100, middle: 95, lower: 90 },
      volume: 10000,
      shortTermTrend: 1,
      support: 90,
      resistance: 100
    },
    previous: {
      price: 93,
      macd: { line: 0.2, signal: 0.4, histogram: -0.2 },
      bollingerBands: { upper: 98, middle: 93, lower: 88 },
      volume: 8000,
      shortTermTrend: -1
    },
    priceBeforePrevious: {
      price: 91,
      volume: 6000
    },
    // trendDirection: 'up',
    // socialSentiment: 'positive',
    marketVolatility: 15,
    previousMarketVolatility: 12
  };
  
  // 使用示例
  const result = evaluateSignal(sampleData);
  
  console.log('交易信号:', result.decision);
  console.log('触发条件:', result.reasoning);
  console.log('置信度:', result.confidence.toFixed(2));