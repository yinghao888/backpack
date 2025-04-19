const BackpackAPI = require('./backpack');
const logger = require('./logger');
const TradeLogger = require('./tradeLogger');
// const TwitterService = require('./twitterService');
const config = require('./config');
const Rule = require('./tradingRules');
const TechnicalIndicators = require('./technicalIndicators');
require('dotenv').config();

class MCP {
    constructor() {
        this.tradingPairs = new Map();
        this.trades = new Map();
        this.tradeAmount = parseFloat(process.env.TRADE_AMOUNT) || 0.001;
        this.minTradeInterval = 300000; // 5分钟
        this.stopLoss = parseFloat(process.env.STOP_LOSS) || 30; // 止损百分比
        this.takeProfit = parseFloat(process.env.TAKE_PROFIT) || 20; // 止盈百分比
        this.backpack = new BackpackAPI(
            process.env.BACKPACK_API_KEY,
            process.env.BACKPACK_API_SECRET
        );
        this.tradeLogger = new TradeLogger();
        // this.twitterService = new TwitterService();
        this.lastTradeTime = new Map(); // 记录每个交易对的最后交易时间
        this.dynamicStopLoss = new Map(); // 动态止损价格
        this.lastTweetCheck = 0; // 上次检查推文的时间
        this.tweetCheckInterval = 15 * 60 * 1000; // 检查推文的时间间隔（15分钟）
        this.lastAnalysisTime = 0; // 上次分析交易的时间
        this.analysisInterval = 60000; // 分析间隔（1分钟）
        
        // Deepseek API 配置
        this.deepseekEndpoint = process.env.DEEPSEEK_API_ENDPOINT;
        this.deepseekApiKey = process.env.DEEPSEEK_API_KEY;
        this.deepseekModel = process.env.DEEPSEEK_MODEL;
        
        // 动态交易参数
        this.dynamicParams = new Map();
        this.updateDynamicParams();
        
        // 每小时更新一次动态参数
        setInterval(() => this.updateDynamicParams(), 60 * 60 * 1000);
        
        // 初始化时加载未关闭的订单
        this.loadOpenTrades().catch(error => {
            logger.error('加载未关闭订单失败:', error);
        });
        
        logger.info('MCP系统初始化完成');
    }

    // 加载未关闭的订单
    async loadOpenTrades() {
        try {
            logger.info('------------------------');
            logger.info('开始加载未关闭的订单...');
            
            // 获取所有交易所的交易记录
            const backpackTrades = await this.tradeLogger.getAllTrades('backpack');
            
            logger.info(`从Backpack获取到 ${backpackTrades.length} 条交易记录`);
            
            // 过滤出状态为open的交易
            const openTrades = backpackTrades.filter(trade => trade.status === 'open');
            
            logger.info(`找到 ${openTrades.length} 个未关闭的订单`);
            
            if (openTrades.length > 0) {
                logger.info('未关闭订单详情:');
                logger.info('------------------------');
                
                // 将未关闭的订单加载到内存中
                for (const trade of openTrades) {
                    const tradeId = trade.id;
                    this.trades.set(tradeId, {
                        ...trade,
                        // 确保所有必要的字段都存在
                        id: tradeId,
                        symbol: trade.symbol,
                        direction: trade.direction,
                        price: parseFloat(trade.price),
                        amount: parseFloat(trade.amount),
                        status: trade.status,
                        openTime: trade.openTime,
                        reason: trade.reason,
                        orderStatus: trade.orderStatus,
                        orderDetails: trade.orderDetails || {},
                        exchange: trade.exchange
                    });
                    
                    // 输出详细的订单信息
                    logger.info(`订单ID: ${tradeId}`);
                    logger.info(`交易对: ${trade.symbol}`);
                    logger.info(`方向: ${trade.direction === 'long' ? '做多' : '做空'}`);
                    logger.info(`开仓价格: ${trade.price}`);
                    logger.info(`数量: ${trade.amount}`);
                    logger.info(`开仓时间: ${new Date(trade.openTime).toLocaleString()}`);
                    logger.info(`开仓原因: ${trade.reason || '未知'}`);
                    logger.info(`订单状态: ${trade.orderStatus || '未知'}`);
                    logger.info('------------------------');
                }
            } else {
                logger.info('没有找到未关闭的订单');
            }
            
            logger.info('未关闭订单加载完成');
            logger.info('------------------------');
        } catch (error) {
            logger.error('加载未关闭订单失败:', error);
            throw error;
        }
    }

    // 初始化MCP系统
    async initialize() {
        try {
            logger.info('------------------------');
            logger.info('开始初始化MCP系统...');
            
            // 获取配置
            const config = require('./config');
            
            // 添加所有配置的交易对
            for (const [symbol, pairConfig] of Object.entries(config.tradingPairs.backpack)) {
                try {
                    await this.addTradingPair(symbol, 'backpack');
                    logger.info(`成功添加交易对: ${symbol}`);
                } catch (error) {
                    logger.error(`添加交易对失败: ${symbol}`, error);
                }
            }
            
            logger.info('MCP系统初始化完成');
            logger.info('------------------------');
            
            // 开始轮询数据
            this.startPolling();
        } catch (error) {
            logger.error('MCP系统初始化失败:', error);
            throw error;
        }
    }

    // 添加轮询方法
    startPolling() {
        const pollingInterval = parseInt(config.POLLING_INTERVAL);
        setInterval(async () => {
            for (const [symbol, data] of this.tradingPairs) {
                try {
                    const klineData = await this.backpack.getSpotKlines(symbol, config.KLINE_INTERVAL, config.KLINE_LIMIT);
                    if (klineData && klineData.length > 0) {
                        await this.handleMarketData(symbol, {
                            price: klineData[klineData.length - 1].close,
                            priceChange: ((klineData[klineData.length - 1].close - klineData[0].close) / klineData[0].close) * 100,
                            volume: klineData[klineData.length - 1].volume
                        }, klineData, 'backpack');
                    } else {
                        logger.warn(`获取 ${symbol} 的K线数据为空`);
                    }
                } catch (error) {
                    logger.error(`轮询数据失败 (${symbol}):`, error);
                }
            }
        }, pollingInterval);
    }

    // 添加交易对监控
    async addTradingPair(symbol, exchange = 'backpack') {
        try {
            // 检查是否已存在
            if (this.tradingPairs.has(symbol)) {
                logger.warn(`交易对 ${symbol} 已存在`);
                return;
            }

            // 获取历史数据
            let historicalData;
            if (exchange === 'backpack') {
                historicalData = await this.backpack.getSpotKlines(symbol);
            } else {
                throw new Error(`不支持的交易所: ${exchange}`);
            }

            if (!historicalData || historicalData.length === 0) {
                throw new Error(`无法获取 ${symbol} 的历史数据`);
            }

            // 初始化交易对数据
            this.tradingPairs.set(symbol, {
                exchange,
                historicalData,
                lastPrice: historicalData[historicalData.length - 1].close,
                lastUpdate: Date.now(),
                dynamicParams: this.getDynamicParams(symbol)
            });

            logger.info(`成功添加交易对: ${symbol} (${exchange})`);
        } catch (error) {
            logger.error(`添加交易对失败: ${symbol}`, error);
            throw error;
        }
    }

    // 获取历史K线数据
    async getHistoricalData(symbol, interval = '1m', limit = 300) {
        try {
            const response = await this.backpack.getKlines({
                symbol,
                interval,
                limit,
            });

            if (response && response.data) {
                return response.data.map(kline => ({
                    timestamp: kline[0],
                    open: parseFloat(kline[1]),
                    high: parseFloat(kline[2]),
                    low: parseFloat(kline[3]),
                    close: parseFloat(kline[4]),
                    volume: parseFloat(kline[5])
                }));
            }
            return [];
        } catch (error) {
            logger.error(`获取历史数据失败 (${symbol}):`, error);
            return [];
        }
    }

    // 移除交易对监控
    removeTradingPair(symbol) {
        if (this.tradingPairs.has(symbol)) {
            const pairData = this.tradingPairs.get(symbol);
            if (pairData.exchange === 'backpack') {
                this.backpack.unsubscribeSpotKlines(symbol, '1h');
            }
            this.tradingPairs.delete(symbol);
            logger.info(`已移除交易对 ${symbol} 的监控`);
        } else {
            logger.warn(`交易对 ${symbol} 不在监控列表中`);
        }
    }

    // 处理市场数据
    async handleMarketData(symbol, currentData, historicalData, exchange) {
        try {
            logger.debug(`收到 ${symbol} 的市场数据更新 (${exchange}):`, {
                price: currentData.price,
                change: currentData.priceChange,
                volume: currentData.volume
            });

            // 更新交易对数据
            const pairData = this.tradingPairs.get(symbol);
            if (pairData) {
                pairData.lastPrice = currentData.price;
                pairData.lastUpdate = Date.now();
            }

            // 准备发送给Deepseek的数据
            const marketContext = {
                symbol: symbol,
                currentPrice: currentData.price,
                priceChange: currentData.priceChange,
                volume: currentData.volume,
                historicalData: historicalData,
                exchange: exchange
            };

            // 调用Deepseek进行分析
            // logger.debug(`开始调用Deepseek分析 ${symbol} 的数据`);
            // const analysis = await this.analyzeWithLLM(marketContext);
            // logger.info(`${symbol} Deepseek分析结果:`);
            // logger.info(`决策: ${analysis.decision}`);
            // logger.info(`置信度: ${(analysis.confidence * 100).toFixed(2)}%`);
            // logger.info(`分析理由: ${analysis.reasoning}`);

            // 处理Deepseek的决策
            // await this.handleLLMDecision(symbol, analysis, exchange);


            const analysis = this.tradingEngine(marketContext);

            this.handleTradineEngineDecision(symbol, analysis, exchange);

            // 更新历史数据
            this.updateHistoricalData(symbol, currentData);
        } catch (error) {
            logger.error(`处理市场数据时出错 (${symbol}):`, error);
        }
    }

    async handleTradineEngineDecision(symbol, analysis, exchange) {
        try {
            // 检查交易频率限制 - 降低最小交易间隔
            const lastTrade = this.lastTradeTime.get(symbol) || 0;
            const now = Date.now();
            const timeSinceLastTrade = now - lastTrade;
            logger.info(`距离上次交易已经过去 ${Math.floor(timeSinceLastTrade / 1000)} 秒`);
            
            // 降低最小交易间隔到2分钟
            if (timeSinceLastTrade < 120000) {
                logger.info(`交易频率过高，需要等待 ${Math.floor((120000 - timeSinceLastTrade) / 1000)} 秒`);
                return;
            }

            // 检查是否有开放的交易
            const openTrades = Array.from(this.trades.values())
                .filter(t => t.symbol === symbol && t.status === 'open');
            
            if (openTrades.length > 0) {
                logger.info(`已有开放的交易 ${openTrades.length} 个，跳过本次交易: ${symbol}`);
                return;
            }
            
            if (analysis.decision === 'BUY') {
                logger.info(`执行买入操作: ${symbol} `);
                await this.executeTrade(symbol, 'buy', analysis.reasoning);
                this.lastTradeTime.set(symbol, now);
            // } else if (analysis.decision === 'SELL') {
            //     logger.info(`执行卖出操作: ${symbol}, 置信度: ${(analysis.confidence * 100).toFixed(2)}%`);
            //     await this.executeTrade(symbol, 'sell', analysis.reasoning);
            //     this.lastTradeTime.set(symbol, now);
            } else {
                logger.info(`保持观望: ${symbol}, 置信度: ${(analysis.confidence * 100).toFixed(2)}%, 原因: ${analysis.reasoning}`);
            }
        } catch (error) {
            logger.error(`处理交易决策时出错: ${symbol}`, error);
            logger.error('错误详情:', error.stack);
            // 不抛出错误，让程序继续执行
        }
    }

    // 使用Deepseek分析市场数据
    async analyzeWithLLM(marketContext) {
        try {
            const prompt = await this.preparePrompt(marketContext);
            logger.debug('准备发送给Deepseek的提示词:', prompt);
            
            const response = await fetch(this.deepseekEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.deepseekApiKey}`
                },
                body: JSON.stringify({
                    model: this.deepseekModel,
                    messages: [
                        {
                            role: "system",
                            content: "你是一个专业的加密货币交易分析助手。请根据提供的市场数据进行分析，并给出交易建议。"
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 500
                })
            });

            if (!response.ok) {
                throw new Error(`Deepseek API请求失败: ${response.status}`);
            }

            const result = await response.json();
            logger.debug('Deepseek API响应:', result);
            return this.parseDeepseekResponse(result);
        } catch (error) {
            logger.error('Deepseek分析失败:', error);
            throw error;
        }
    }

    // tradingEngine
    tradingEngine(marketContext) {
        const { symbol, currentPrice, priceChange, volume, historicalData } = marketContext;
        
        // 确保历史数据是有效的
        if (!historicalData || historicalData.length < 26) {
            logger.error(`${symbol} 没有足够的历史数据，需要至少26个数据点，当前只有 ${historicalData ? historicalData.length : 0} 个数据点`);
            return {
                decision: 'HOLD',
                confidence: 0,
                reasoning: '没有足够的历史数据进行分析',
                triggeredConditions: []
            };
        }
        
        // 计算技术指标
        const priceHistory = historicalData.map(d => parseFloat(d.close));
        const avgPrice = priceHistory.reduce((a, b) => a + b, 0) / priceHistory.length;
        const priceVolatility = TechnicalIndicators.calculateVolatility(priceHistory);
        
        // 计算RSI
        const rsi = TechnicalIndicators.calculateRSI(priceHistory);
        
        // 计算MACD
        const { macd, signal, histogram } = TechnicalIndicators.calculateMACD(priceHistory);
        
        // 计算布林带
        const { upper, middle, lower } = TechnicalIndicators.calculateBollingerBands(priceHistory);
        
        // 计算成交量变化
        const volumeHistory = historicalData.map(d => parseFloat(d.volume));
        const avgVolume = volumeHistory.reduce((a, b) => a + b, 0) / volumeHistory.length;
        const volumeChange = ((volume - avgVolume) / avgVolume) * 100;
        
        // 计算价格趋势
        const shortTermTrend = TechnicalIndicators.calculateTrend(priceHistory.slice(-6)); // 最近6小时
        const longTermTrend = TechnicalIndicators.calculateTrend(priceHistory); // 24小时
        
        // 计算支撑位和阻力位
        const { support, resistance } = TechnicalIndicators.calculateSupportResistance(priceHistory);

        logger.debug(`计算 ${symbol} 的技术指标:`, {
            avgPrice: avgPrice.toFixed(2),
            volatility: priceVolatility.toFixed(2),
            priceChange: ((currentPrice/avgPrice - 1) * 100).toFixed(2),
            rsi: rsi.toFixed(2),
            macd: macd.toFixed(8),
            signal: signal.toFixed(8),
            histogram: histogram.toFixed(8),
            volumeChange: volumeChange.toFixed(2)
        });

        // 前一期的统计数据
        const previousData = historicalData[historicalData.length-2];
        const previousPriceHistory = priceHistory.slice(0, -1);
        const previousMarketVolatility = TechnicalIndicators.calculateVolatility(previousPriceHistory);
        // 计算RSI
        const previousRSI = TechnicalIndicators.calculateRSI(previousPriceHistory);
        // 计算MACD
        const previousMACD = TechnicalIndicators.calculateMACD(previousPriceHistory);
        // 计算布林带
        const previousBollingerBands = TechnicalIndicators.calculateBollingerBands(previousPriceHistory);
        const previousShortTermTrend = TechnicalIndicators.calculateTrend(previousPriceHistory.slice(-6)); // 最近6小时

        // 前两期的统计数据
        const beforePrevious = historicalData[historicalData.length-3];

        const data = {
            current: {
                price: parseFloat(currentPrice),
                rsi: rsi,
                macd: { line: macd, signal: signal, histogram: histogram },
                bollingerBands: { upper: upper, middle: middle, lower: lower },
                volume: parseFloat(volume),
                shortTermTrend: shortTermTrend,
                support: parseFloat(support),
                resistance: parseFloat(resistance)
            },
            previous: {
                price: parseFloat(previousData.close),
                macd: previousMACD,
                bollingerBands: previousBollingerBands,
                volume: parseFloat(previousData.volume),
                shortTermTrend: previousShortTermTrend
            },
            priceBeforePrevious: {
                price: parseFloat(beforePrevious.close),
                volume: parseFloat(beforePrevious.volume)
            },
            marketVolatility: priceVolatility,
            previousMarketVolatility: previousMarketVolatility
        };

        // 添加调试日志
        logger.debug('交易引擎数据:', {
            symbol,
            data
        });

        // 调用交易规则进行分析
        const analysis = Rule.evaluateSignal(data);

        // 添加调试日志
        logger.debug('交易引擎分析结果:', {
            symbol,
            decision: analysis.decision,
            confidence: (analysis.confidence * 100).toFixed(2) + '%',
            reasoning: analysis.reasoning,
            triggeredConditions: analysis.triggeredConditions
        });

        return analysis;
    }



    // 准备发送给Deepseek的提示词
    async preparePrompt(marketContext) {
        const { symbol, currentPrice, priceChange, volume, historicalData } = marketContext;
        
        // 计算技术指标
        const priceHistory = historicalData.map(d => d.close);
        const avgPrice = priceHistory.reduce((a, b) => a + b, 0) / priceHistory.length;
        const priceVolatility = TechnicalIndicators.calculateVolatility(priceHistory);
        
        // 计算RSI
        const rsi = TechnicalIndicators.calculateRSI(priceHistory);
        
        // 计算MACD
        const { macd, signal, histogram } = TechnicalIndicators.calculateMACD(priceHistory);
        
        // 计算布林带
        const { upper, middle, lower } = TechnicalIndicators.calculateBollingerBands(priceHistory);
        
        // 计算成交量变化
        const volumeHistory = historicalData.map(d => d.volume);
        const avgVolume = volumeHistory.reduce((a, b) => a + b, 0) / volumeHistory.length;
        const volumeChange = ((volume - avgVolume) / avgVolume) * 100;
        
        // 计算价格趋势
        const shortTermTrend = TechnicalIndicators.calculateTrend(priceHistory.slice(-6)); // 最近6小时
        const longTermTrend = TechnicalIndicators.calculateTrend(priceHistory); // 24小时
        
        // 计算支撑位和阻力位
        const { support, resistance } = TechnicalIndicators.calculateSupportResistance(priceHistory);

        // 获取并分析推文
        // const tweetAnalysis = await this.getTweetAnalysis(symbol);
        
        logger.debug(`计算 ${symbol} 的技术指标:`, {
            avgPrice: avgPrice.toFixed(2),
            volatility: priceVolatility.toFixed(2),
            priceChange: ((currentPrice/avgPrice - 1) * 100).toFixed(2),
            rsi: rsi.toFixed(2),
            macd: macd.toFixed(2),
            signal: signal.toFixed(2),
            histogram: histogram.toFixed(2),
            volumeChange: volumeChange.toFixed(2)
        });



        // 构建推文分析部分
        let tweetAnalysisSection = '';
        if (tweetAnalysis.relevance > 0) {
            tweetAnalysisSection = `
币安官方动态：
- 情感分析: ${tweetAnalysis.sentiment}
- 市场影响: ${tweetAnalysis.marketImpact}
- 相关性评分: ${(tweetAnalysis.relevance * 100).toFixed(1)}%
- 关键词: ${tweetAnalysis.keywords.join(', ') || '无'}
${tweetAnalysis.relatedAnnouncements.length > 0 ? '- 相关公告:\n' + tweetAnalysis.relatedAnnouncements.map(a => `  * ${a.text} (${new Date(a.time).toLocaleString()}, 相关性: ${(a.relevance * 100).toFixed(1)}%)`).join('\n') : ''}`;
        }

        return `
分析以下加密货币交易数据并给出明确的交易建议：

交易对: ${symbol}
当前价格: ${currentPrice} USDT
24小时价格变化: ${priceChange}%
24小时交易量: ${volume} USDT

技术指标分析：
1. 趋势指标：
- 短期趋势(6小时): ${shortTermTrend.toFixed(2)}%
- 长期趋势(24小时): ${longTermTrend.toFixed(2)}%
- RSI(14): ${rsi.toFixed(2)}
- MACD: ${macd.toFixed(2)}
- MACD信号线: ${signal.toFixed(2)}
- MACD柱状图: ${histogram.toFixed(2)}

2. 价格区间：
- 布林带上轨: ${upper.toFixed(2)}
- 布林带中轨: ${middle.toFixed(2)}
- 布林带下轨: ${lower.toFixed(2)}
- 支撑位: ${support}
- 阻力位: ${resistance}

3. 波动指标：
- 价格波动率: ${priceVolatility.toFixed(2)}%
- 成交量变化: ${volumeChange.toFixed(2)}%
- 价格位置: ${TechnicalIndicators.getPricePosition(currentPrice, upper, lower)}
- 趋势强度: ${TechnicalIndicators.getTrendStrength(shortTermTrend, longTermTrend)}
- 成交量状态: ${TechnicalIndicators.getVolumeStatus(volume, avgVolume)}

${tweetAnalysisSection}

交易规则（满足任一条件即可）：

买入信号：
1. RSI < 40 且 MACD柱状图为正
2. 价格接近支撑位（与支撑位差距小于3%）且成交量增加
3. 价格在布林带下轨附近（差距小于2%）且短期趋势开始转正
4. MACD金叉（MACD线上穿信号线）且成交量放大
5. 连续2小时价格上涨且RSI < 65
6. 价格突破布林带中轨且成交量放大
7. 短期趋势为正且RSI < 60

卖出信号：
1. RSI > 60 且 MACD柱状图为负
2. 价格接近阻力位（与阻力位差距小于3%）且成交量增加
3. 价格在布林带上轨附近（差距小于2%）且短期趋势开始转负
4. MACD死叉（MACD线下穿信号线）且成交量放大
5. 连续2小时价格下跌且RSI > 35
6. 价格跌破布林带中轨且成交量放大
7. 短期趋势为负且RSI > 40

加分因素（提高置信度）：
1. 趋势方向与交易方向一致
2. 成交量持续放大
3. 布林带开口方向与趋势一致
4. 社交媒体情绪与交易方向一致
5. 价格突破重要支撑/阻力位
6. 市场波动率增加

请根据以上数据和规则进行分析，并给出明确的交易建议：
{
    "decision": "BUY" | "SELL" | "HOLD",
    "confidence": 0.0-1.0,
    "reasoning": "详细的分析原因，包括触发的具体交易规则和关键指标分析"
}
`;
    }

    // 解析Deepseek的响应
    parseDeepseekResponse(response) {
        try {
            const content = response.choices[0].message.content;
            logger.debug('Deepseek原始响应:', content);
            
            // 处理可能的 Markdown 格式
            let jsonContent = content;
            if (content.includes('```json')) {
                jsonContent = content.split('```json')[1].split('```')[0].trim();
            } else if (content.includes('```')) {
                jsonContent = content.split('```')[1].split('```')[0].trim();
            }
            
            // 清理控制字符
            jsonContent = jsonContent.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
            
            const analysis = JSON.parse(jsonContent);
            
            // 验证响应格式
            if (!analysis.decision || !analysis.confidence || !analysis.reasoning) {
                throw new Error('Deepseek响应格式不正确');
            }

            return analysis;
        } catch (error) {
            logger.error('解析Deepseek响应失败:', error);
            throw error;
        }
    }

    // 处理Deepseek的决策
    async handleLLMDecision(symbol, analysis, exchange) {
        // 输出详细的决策分析结果
        logger.info('------------------------');
        logger.info(`${symbol} Deepseek决策分析 (${exchange}):`);
        logger.info(`决策: ${analysis.decision}`);
        logger.info(`置信度: ${(analysis.confidence * 100).toFixed(2)}%`);
        logger.info(`分析理由: ${analysis.reasoning}`);
        logger.info('------------------------');
        
        // 检查交易频率限制 - 降低最小交易间隔
        const lastTrade = this.lastTradeTime.get(symbol) || 0;
        const now = Date.now();
        const timeSinceLastTrade = now - lastTrade;
        logger.info(`距离上次交易已经过去 ${Math.floor(timeSinceLastTrade / 1000)} 秒`);
        
        // 降低最小交易间隔到2分钟
        if (timeSinceLastTrade < 120000) {
            logger.info(`交易频率过高，需要等待 ${Math.floor((120000 - timeSinceLastTrade) / 1000)} 秒`);
            return;
        }

        // 检查是否有开放的交易
        const openTrades = Array.from(this.trades.values())
            .filter(t => t.symbol === symbol && t.status === 'open');
        
        if (openTrades.length > 0) {
            logger.info(`已有开放的交易 ${openTrades.length} 个，跳过本次交易: ${symbol}`);
            return;
        }
        
        // 降低置信度阈值到40%
        const confidenceThreshold = 0.4;
        if (analysis.confidence < confidenceThreshold) {
            logger.info(`置信度 ${(analysis.confidence * 100).toFixed(2)}% 低于阈值 ${(confidenceThreshold * 100)}%，跳过交易`);
            return;
        }
        
        if (analysis.decision === 'BUY') {
            logger.info(`执行买入操作: ${symbol}, 置信度: ${(analysis.confidence * 100).toFixed(2)}%`);
            await this.executeTrade(symbol, 'buy', analysis.reasoning);
            this.lastTradeTime.set(symbol, now);
        } else if (analysis.decision === 'SELL') {
            logger.info(`执行卖出操作: ${symbol}, 置信度: ${(analysis.confidence * 100).toFixed(2)}%`);
            await this.executeTrade(symbol, 'sell', analysis.reasoning);
            this.lastTradeTime.set(symbol, now);
        } else {
            logger.info(`保持观望: ${symbol}, 置信度: ${(analysis.confidence * 100).toFixed(2)}%`);
        }
    }

    // 获取交易对配置
    getTradingPairConfig(symbol) {
        const config = require('./config');
        return config.tradingPairs.backpack[symbol] || {
            tradeAmount: 0.1,
            maxPositionSize: 1,
            stopLoss: 30,
            takeProfit: 20
        };
    }

    // 执行交易
    async executeTrade(symbol, action, reason = '', exchange = 'backpack') {
        try {
            logger.info('------------------------');
            logger.info(`开始执行交易: ${symbol} ${action}`);
            logger.info(`交易原因: ${reason}`);
            logger.info(`交易所: ${exchange}`);
            
            // 获取交易对配置
            const pairConfig = this.getTradingPairConfig(symbol);
            
            // 检查交易间隔
            const lastTradeTime = this.lastTradeTime.get(symbol) || 0;
            const timeSinceLastTrade = Date.now() - lastTradeTime;
            logger.info(`距离上次交易时间: ${Math.floor(timeSinceLastTrade / 1000)} 秒`);
            
            if (timeSinceLastTrade < this.minTradeInterval) {
                logger.warn(`交易间隔太短: ${symbol}, 需要等待 ${Math.floor((this.minTradeInterval - timeSinceLastTrade) / 1000)} 秒`);
                return null;
            }

            // 获取当前价格
            logger.info(`正在获取 ${symbol} 的当前价格...`);
            const currentPrice = await this.getCurrentPrice(symbol, exchange);
            if (!currentPrice) {
                logger.error(`无法获取当前价格: ${symbol}`);
                return null;
            }
            logger.info(`当前价格: ${currentPrice}`);

            // 执行交易
            logger.info(`准备执行 ${action} 操作...`);
            let order;
            if (action.toLowerCase() === 'buy') {
                logger.info(`买入数量: ${pairConfig.tradeAmount}`);
                order = await this.openPosition(symbol, pairConfig.tradeAmount);
            } else {
                logger.info(`卖出数量: ${pairConfig.tradeAmount}`);
                order = await this.closePosition(symbol, pairConfig.tradeAmount);
            }
            
            if (!order) {
                logger.error(`交易执行失败: ${symbol} ${action}`);
                return null;
            }
            
            logger.info(`订单执行结果:`, order);

            // 检查订单状态
            if (order.status === 'Cancelled') {
                logger.error(`订单已取消: ${symbol} ${action}`);
                return null;
            }

            // 生成交易ID
            const tradeId = order.id || `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            logger.info(`生成交易ID: ${tradeId}`);

            // 创建交易记录
            const trade = {
                id: tradeId,
                symbol: symbol,
                exchange: exchange,
                direction: action.toLowerCase() === 'buy' ? 'long' : 'short',
                price: currentPrice,
                amount: pairConfig.tradeAmount,
                status: action.toLowerCase() === 'buy' ? 'open' : 'closed',
                openTime: Date.now(),
                closeTime: action.toLowerCase() === 'sell' ? Date.now() : null,
                reason: reason,
                orderStatus: order.status || 'unknown',
                orderDetails: {
                    orderType: order.orderType,
                    clientId: order.clientId,
                    executedQuantity: order.executedQuantity,
                    executedQuoteQuantity: order.executedQuoteQuantity,
                    quantity: order.quantity,
                    quoteQuantity: order.quoteQuantity,
                    side: order.side,
                    timeInForce: order.timeInForce,
                    selfTradePrevention: order.selfTradePrevention
                }
            };
            logger.info(`创建交易记录:`, trade);

            // 如果是买入操作，添加到交易列表
            if (action.toLowerCase() === 'buy') {
                this.trades.set(tradeId, trade);
            } else {
                // 如果是卖出操作，更新现有交易状态
                const existingTrade = Array.from(this.trades.values())
                    .find(t => t.symbol === symbol && t.status === 'open');
                if (existingTrade) {
                    existingTrade.status = 'closed';
                    existingTrade.closeTime = Date.now();
                    existingTrade.closePrice = currentPrice;
                    existingTrade.closeReason = reason;
                    existingTrade.orderStatus = order.status || 'unknown';
                    existingTrade.orderDetails = trade.orderDetails;
                    logger.info(`更新交易状态:`, existingTrade);
                }
            }

            this.lastTradeTime.set(symbol, Date.now());

            // 记录交易日志
            logger.info(`正在记录交易日志...`);
            await this.tradeLogger.logTrade(trade);
            logger.info(`交易日志记录完成`);

            logger.info(`交易执行完成: ${symbol} ${action}`);
            logger.info('------------------------');

            return trade;
        } catch (error) {
            logger.error(`执行交易失败: ${symbol} ${action}`, error);
            logger.error('错误详情:', error.stack);
            return null;
        }
    }

    async openPosition(symbol, formattedQuantity) {
        try {
            logger.info(`开始开仓操作: ${symbol}`);
            logger.info(`交易参数:`, {
                symbol,
                side: 'Bid',
                orderType: 'Market',
                quantity: formattedQuantity,
                timeInForce: 'GTC',
                selfTradePrevention: 'RejectTaker'
            });
            
            const order = await this.backpack.api('orderExecute', {
                symbol: symbol,
                side: 'Bid',
                orderType: 'Market',
                quantity: formattedQuantity,
                timeInForce: 'GTC',
                selfTradePrevention: 'RejectTaker'
            });
            
            logger.info(`开仓成功: ${symbol}`, order);
            return order;
        } catch (error) {
            logger.error(`开仓失败: ${symbol}`, error);
            logger.error('错误详情:', error.stack);
            // 不抛出错误，让程序继续执行
            return null;
        }
    }

    /**
     * 检查账户余额
     * @param {string} symbol 交易对
     * @param {number} requiredAmount 需要的数量
     * @returns {Promise<boolean>} 是否有足够余额
     */
    async checkBalance(symbol, requiredAmount) {
        try {
            logger.info(`正在检查 ${symbol} 的账户余额...`);
            const balances = await this.backpack.getBalance();
            logger.info(`账户余额信息:`, balances);

            // 从交易对中提取资产名称（例如：从 SOL_USDC 中提取 SOL）
            const asset = symbol.split('_')[0];
            
            // 检查资产余额
            if (!balances[asset]) {
                logger.error(`未找到 ${asset} 的余额信息`);
                return false;
            }

            const availableBalance = parseFloat(balances[asset].available || '0');
            logger.info(`${asset} 可用余额: ${availableBalance}, 需要数量: ${requiredAmount}`);

            if (availableBalance < requiredAmount) {
                logger.error(`余额不足: 需要 ${requiredAmount} ${asset}, 但只有 ${availableBalance} ${asset}`);
                return false;
            }

            logger.info(`余额充足: ${availableBalance} ${asset}`);
            return true;
        } catch (error) {
            logger.error(`检查余额失败: ${symbol}`, error);
            logger.error('错误详情:', error.stack);
            return false;
        }
    }

    async closePosition(symbol, formattedQuantity) {
        try {
            logger.info(`开始平仓操作: ${symbol}`);
            
            // 验证数量格式
            const quantity = parseFloat(formattedQuantity);
            if (isNaN(quantity) || quantity <= 0) {
                logger.error(`无效的数量格式: ${formattedQuantity}`);
                return null;
            }

            // 检查余额
            const hasEnoughBalance = await this.checkBalance(symbol, quantity);
            if (!hasEnoughBalance) {
                logger.error(`余额不足，无法执行平仓操作: ${symbol}`);
                return null;
            }

            logger.info(`交易参数:`, {
                symbol,
                side: 'Ask',
                orderType: 'Market',
                quantity: formattedQuantity,
                timeInForce: 'GTC',
                selfTradePrevention: 'RejectTaker'
            });
            
            const order = await this.backpack.api('orderExecute', {
                symbol: symbol,
                side: 'Ask',
                orderType: 'Market',
                quantity: formattedQuantity,
                timeInForce: 'GTC',
                selfTradePrevention: 'RejectTaker'
            });
            
            logger.info(`平仓成功: ${symbol}`, order);
            return order;
        } catch (error) {
            logger.error(`平仓失败: ${symbol}`, error);
            logger.error('错误详情:', error.stack);
            return null;
        }
    }

    // 更新动态交易参数
    updateDynamicParams() {
        try {
            logger.info('------------------------');
            logger.info('开始更新动态交易参数...');
            
            for (const [symbol, pair] of this.tradingPairs) {
                if (pair.historicalData) {
                    pair.dynamicParams = this.getDynamicParams(symbol);
                    logger.info(`更新 ${symbol} 的动态参数:`, pair.dynamicParams);
                }
            }
            
            logger.info('动态交易参数更新完成');
            logger.info('------------------------');
        } catch (error) {
            logger.error('更新动态交易参数失败:', error);
        }
    }

    // 获取动态参数
    getDynamicParams(symbol) {
        const pair = this.tradingPairs.get(symbol);
        if (!pair || !pair.historicalData) {
            return {
                rsiLowerThreshold: 30,
                rsiUpperThreshold: 70,
                stopLossPercentage: 2,
                takeProfitPercentage: 4
            };
        }

        const prices = pair.historicalData.map(d => d.close);
        const rsi = TechnicalIndicators.calculateRSI(prices);
        const volatility = TechnicalIndicators.calculateVolatility(prices);

        return {
            rsiLowerThreshold: Math.max(20, 30 - (volatility * 5)),
            rsiUpperThreshold: Math.min(80, 70 + (volatility * 5)),
            stopLossPercentage: Math.max(1, 2 - (volatility * 2)),
            takeProfitPercentage: Math.max(2, 4 + (volatility * 2))
        };
    }

    // 分析交易
    async analyzeTrades() {
        try {
            logger.info('------------------------');
            logger.info('开始分析开放交易...');
            
            const openTrades = Array.from(this.trades.values()).filter(t => t.status === 'open');
            logger.info(`当前开放交易数量: ${openTrades.length}`);

            for (const trade of openTrades) {
                // 确保trade.id存在，如果不存在则使用默认值
                const tradeId = trade.id || '未知ID';
                
                logger.info(`分析交易 ${tradeId}:`, {
                    symbol: trade.symbol,
                    direction: trade.direction,
                    openPrice: trade.price,
                    openTime: new Date(trade.openTime).toLocaleString()
                });

                const currentPrice = await this.getCurrentPrice(trade.symbol, trade.exchange);
                if (!currentPrice) {
                    logger.warn(`无法获取 ${trade.symbol} 的当前价格，跳过分析`);
                    continue;
                }
                logger.info(`当前价格: ${currentPrice}`);

                // 获取交易对配置
                const pairConfig = this.getTradingPairConfig(trade.symbol);

                // 计算盈亏
                let profitLoss = 0;
                let profitAmount = 0;
                if (trade.direction === 'long') {
                    profitLoss = ((currentPrice - trade.price) / trade.price) * 100;
                    profitAmount = (currentPrice - trade.price) * trade.amount;
                } else {
                    profitLoss = ((trade.price - currentPrice) / trade.price) * 100;
                    profitAmount = (trade.price - currentPrice) * trade.amount;
                }

                logger.info(`交易 ${tradeId} 盈亏情况:`, {
                    profitLoss: `${profitLoss.toFixed(2)}%`,
                    profitAmount: `${profitAmount.toFixed(2)} USDT`,
                    takeProfit: `${pairConfig.takeProfit}%`,
                    stopLoss: `${pairConfig.stopLoss}%`
                });

                // 检查止盈止损条件
                let shouldClose = false;
                let exitReason = '';

                // 止盈条件
                if (profitLoss >= pairConfig.takeProfit) {
                    shouldClose = true;
                    exitReason = 'take_profit';
                    logger.info(`触发止盈条件: 当前盈利 ${profitLoss.toFixed(2)}% >= 止盈点 ${pairConfig.takeProfit}%`);
                }
                // 止损条件
                else if (profitLoss <= -pairConfig.stopLoss) {
                    shouldClose = true;
                    exitReason = 'stop_loss';
                    logger.info(`触发止损条件: 当前亏损 ${profitLoss.toFixed(2)}% <= 止损点 -${pairConfig.stopLoss}%`);
                }

                if (shouldClose) {
                    logger.info(`准备执行平仓操作: ${trade.symbol}`);
                    // 执行平仓
                    const closeAction = trade.direction === 'long' ? 'sell' : 'buy';
                    await this.executeTrade(trade.symbol, closeAction, `自动${exitReason === 'take_profit' ? '止盈' : '止损'}`);

                    // 更新交易记录
                    logger.info(`更新交易记录: ${tradeId}`);
                    await this.tradeLogger.updateTrade(trade.symbol, trade.exchange, tradeId, {
                        status: 'closed',
                        exitPrice: currentPrice,
                        exitTime: Date.now(),
                        exitReason: exitReason,
                        profitLoss: profitLoss.toFixed(2),
                        profitAmount: profitAmount.toFixed(2)
                    });

                    logger.info(`交易 ${tradeId} 已${exitReason === 'take_profit' ? '止盈' : '止损'}平仓，盈亏: ${profitLoss.toFixed(2)}%，盈利金额: ${profitAmount.toFixed(2)} USDT`);
                } else {
                    logger.info(`交易 ${tradeId} 未触发止盈止损条件，继续持有`);
                }
            }
            logger.info('交易分析完成');
            logger.info('------------------------');
        } catch (error) {
            logger.error(`分析交易失败: ${error.message}`);
            logger.error('错误详情:', error.stack);
        }
    }

    // 更新历史数据
    updateHistoricalData(symbol, currentData) {
        logger.info('------------------------');
        logger.info(`开始更新 ${symbol} 的历史数据`);
        
        const pairData = this.tradingPairs.get(symbol);
        if (pairData) {
            const newData = {
                timestamp: currentData.timestamp,
                open: currentData.price,
                high: currentData.price,
                low: currentData.price,
                close: currentData.price,
                volume: currentData.volume
            };
            
            logger.info(`新数据:`, newData);
            
            pairData.historicalData.push(newData);
            logger.info(`当前历史数据点数量: ${pairData.historicalData.length}`);

            // 保持最近24小时的数据
            if (pairData.historicalData.length > 24) {
                const removedData = pairData.historicalData.shift();
                logger.info(`移除最旧数据点:`, removedData);
            }

            logger.info(`更新 ${symbol} 的历史数据完成`);
            
            // 控制分析频率
            const now = Date.now();
            const timeSinceLastAnalysis = now - this.lastAnalysisTime;
            logger.info(`距离上次分析时间: ${Math.floor(timeSinceLastAnalysis / 1000)} 秒`);
            
            if (timeSinceLastAnalysis >= this.analysisInterval) {
                logger.info(`触发定期分析，开始分析交易...`);
                this.lastAnalysisTime = now;
                this.analyzeTrades();
            } else {
                logger.info(`未到分析时间，跳过本次分析`);
            }
        } else {
            logger.warn(`未找到 ${symbol} 的交易对数据`);
        }
        logger.info('------------------------');
    }

    // 获取推文分析
    async getTweetAnalysis(symbol) {
        const now = Date.now();
        if (now - this.lastTweetCheck < this.tweetCheckInterval) {
            return this.lastTweetAnalysis || {
                sentiment: 'neutral',
                keywords: [],
                announcements: [],
                marketImpact: 'low',
                relevance: 'low',
                relatedAnnouncements: []
            };
        }

        try {
            const tweets = await this.twitterService.getLatestTweets();
            if (!tweets || tweets.length === 0) {
                logger.warn('未获取到推文');
                return {
                    sentiment: 'neutral',
                    keywords: [],
                    announcements: [],
                    marketImpact: 'low',
                    relevance: 'low',
                    relatedAnnouncements: []
                };
            }
            
            const analysis = this.twitterService.analyzeTweetContent(tweets, symbol);
            
            // 更新缓存
            this.lastTweetCheck = now;
            this.lastTweetAnalysis = analysis;
            
            logger.debug('推文分析结果:', {
                ...analysis,
                relatedAnnouncements: analysis.relatedAnnouncements.map(a => ({
                    text: a.text,
                    time: new Date(a.time).toLocaleString(),
                    relevance: a.relevance
                }))
            });
            return analysis;
        } catch (error) {
            logger.error('获取推文分析失败:', error);
            return {
                sentiment: 'neutral',
                keywords: [],
                announcements: [],
                marketImpact: 'low',
                relevance: 'low',
                relatedAnnouncements: []
            };
        }
    }

    /**
     * 获取当前价格
     * @param {string} symbol 交易对
     * @param {string} exchange 交易所
     * @returns {Promise<number|null>} 当前价格，如果获取失败则返回 null
     */
    async getCurrentPrice(symbol, exchange = 'backpack') {
        try {
            if (exchange === 'backpack') {
                logger.info(`正在获取 ${symbol} 的当前价格...`);
                const ticker = await this.backpack.getTicker({ symbol });
                logger.info(`获取到 ${symbol} 的价格数据:`, ticker);
                
                if (!ticker) {
                    logger.error(`获取 ${symbol} 价格数据失败: 返回数据为空`);
                    return null;
                }
                
                if (!ticker.lastPrice) {
                    logger.error(`获取 ${symbol} 价格数据失败: 没有最新价格`);
                    return null;
                }
                
                const price = parseFloat(ticker.lastPrice);
                if (isNaN(price)) {
                    logger.error(`获取 ${symbol} 价格数据失败: 价格不是有效数字`);
                    return null;
                }
                
                logger.info(`${symbol} 当前价格: ${price}`);
                return price;
            } else {
                throw new Error(`不支持的交易所: ${exchange}`);
            }
        } catch (error) {
            logger.error(`获取当前价格失败: ${symbol}`, error);
            logger.error('错误详情:', error.stack);
            return null;
        }
    }

    // 测试MACD计算方法
    testMACD() {
        logger.info('开始测试MACD计算方法');
        
        // 测试用例1: 简单的上升趋势
        const prices1 = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40];
        const macd1 = TechnicalIndicators.calculateMACD(prices1);
        logger.info('测试用例1 (上升趋势):', macd1);
        
        // 测试用例2: 简单的下降趋势
        const prices2 = [40, 39, 38, 37, 36, 35, 34, 33, 32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10];
        const macd2 = TechnicalIndicators.calculateMACD(prices2);
        logger.info('测试用例2 (下降趋势):', macd2);
        
        // 测试用例3: 震荡市场
        const prices3 = [20, 22, 18, 21, 19, 23, 17, 20, 22, 18, 21, 19, 23, 17, 20, 22, 18, 21, 19, 23, 17, 20, 22, 18, 21, 19, 23, 17, 20, 22, 18];
        const macd3 = TechnicalIndicators.calculateMACD(prices3);
        logger.info('测试用例3 (震荡市场):', macd3);
        
        // 测试用例4: 真实市场数据模拟
        const prices4 = [100, 102, 104, 103, 106, 105, 107, 109, 110, 112, 111, 113, 115, 114, 116, 118, 117, 119, 121, 120, 122, 124, 123, 125, 127, 126, 128, 130, 129, 131, 133];
        const macd4 = TechnicalIndicators.calculateMACD(prices4);
        logger.info('测试用例4 (真实市场数据模拟):', macd4);
        
        // 测试用例5: 数据不足的情况
        const prices5 = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
        const macd5 = TechnicalIndicators.calculateMACD(prices5);
        logger.info('测试用例5 (数据不足):', macd5);
        
        logger.info('MACD测试完成');
        return {
            test1: macd1,
            test2: macd2,
            test3: macd3,
            test4: macd4,
            test5: macd5
        };
    }
}

module.exports = MCP;
