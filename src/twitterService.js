const { TwitterApi } = require('twitter-api-v2');
const logger = require('./logger');
require('dotenv').config();

class TwitterService {
    constructor() {
        this.client = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);
        this.binanceAccountId = '877807935493033984'; // 币安官方账号ID
        this.lastRequestTime = 0; // 上次请求时间
        this.requestInterval = 1 * 60 * 1000; // 1分钟（毫秒）
    }

    async getLatestTweets(count = 10) {
        try {
            // 检查是否满足请求间隔
            const now = Date.now();
            const timeSinceLastRequest = now - this.lastRequestTime;
            
            if (timeSinceLastRequest < this.requestInterval) {
                logger.warn(`Twitter API 请求间隔不足，需要等待 ${Math.ceil((this.requestInterval - timeSinceLastRequest) / 1000)} 秒`);
                return [];
            }

            const tweets = await this.client.v2.userTimeline(this.binanceAccountId, {
                max_results: count,
                'tweet.fields': 'created_at,public_metrics',
                exclude: 'replies,retweets'
            });

            if (!tweets.data || !tweets.data.data) {
                logger.warn('推文数据格式不正确');
                return [];
            }

            // 更新最后请求时间
            this.lastRequestTime = now;
            
            return tweets.data.data.map(tweet => ({
                id: tweet.id,
                text: tweet.text,
                createdAt: tweet.created_at,
                metrics: tweet.public_metrics || {
                    retweet_count: 0,
                    reply_count: 0,
                    like_count: 0
                }
            }));
        } catch (error) {
            logger.error('获取推文失败:', error);
            return [];
        }
    }

    // 分析推文内容，提取关键信息
    analyzeTweetContent(tweets, symbol) {
        const analysis = {
            sentiment: 'neutral',
            keywords: [],
            announcements: [],
            marketImpact: 'low',
            relevance: 0,
            relatedAnnouncements: []
        };

        // 从symbol中提取代币名称（去掉USDT）
        const tokenName = symbol.replace('USDT', '');
        
        // 只分析相关推文
        const relevantTweets = tweets.filter(tweet => {
            const text = tweet.text.toLowerCase();
            const tokenMentioned = text.includes(tokenName.toLowerCase());
            return tokenMentioned;
        });

        if (relevantTweets.length === 0) {
            logger.info(`未找到与 ${symbol} 相关的推文`);
            return analysis;
        }

        logger.info(`找到 ${relevantTweets.length} 条与 ${symbol} 相关的推文`);
        
        for (const tweet of relevantTweets) {
            const text = tweet.text.toLowerCase();
            const relevance = this.calculateRelevance(text, tokenName);
            
            // 提取关键词
            const keywords = this.extractKeywords(text);
            analysis.keywords.push(...keywords);

            // 检测重要公告
            if (this.isImportantAnnouncement(text)) {
                const announcement = {
                    text: tweet.text,
                    time: tweet.createdAt,
                    relevance: relevance
                };
                analysis.announcements.push(announcement);
                analysis.relatedAnnouncements.push(announcement);
            }

            // 分析情感
            const sentiment = this.analyzeSentiment(text);
            if (sentiment !== 'neutral') {
                analysis.sentiment = sentiment;
            }

            // 评估市场影响
            const impact = this.assessMarketImpact(text, tweet.metrics);
            if (impact !== 'low') {
                analysis.marketImpact = impact;
            }

            // 更新整体相关性
            if (relevance > analysis.relevance) {
                analysis.relevance = relevance;
            }
        }

        return analysis;
    }

    // 计算推文与代币的相关性
    calculateRelevance(text, tokenName) {
        let relevance = 0;
        const tokenLower = tokenName.toLowerCase();
        const textLower = text.toLowerCase();
        
        // 直接提到代币名称
        if (textLower.includes(tokenLower)) {
            relevance += 0.5;
        }
        
        // 检查是否包含代币相关的关键词
        const relatedKeywords = [
            'listing', 'delisting', 'airdrop', 'burn', 'stake', 'launch',
            'update', 'maintenance', 'upgrade', 'partnership', 'integration'
        ];
        
        for (const keyword of relatedKeywords) {
            if (textLower.includes(keyword)) {
                relevance += 0.2;
            }
        }
        
        // 检查是否包含价格相关词汇
        const priceKeywords = ['price', 'trading', 'market', 'volume', 'liquidity'];
        for (const keyword of priceKeywords) {
            if (textLower.includes(keyword)) {
                relevance += 0.1;
            }
        }
        
        // 限制相关性分数在0-1之间
        return Math.min(1, relevance);
    }

    // 提取关键词
    extractKeywords(text) {
        const keywords = [];
        const commonKeywords = [
            'listing', 'delisting', 'airdrop', 'burn', 'stake', 'launch',
            'update', 'maintenance', 'upgrade', 'partnership', 'integration'
        ];

        for (const keyword of commonKeywords) {
            if (text.includes(keyword)) {
                keywords.push(keyword);
            }
        }

        return keywords;
    }

    // 检测重要公告
    isImportantAnnouncement(text) {
        const importantPatterns = [
            /new listing/i,
            /delisting/i,
            /airdrop/i,
            /token burn/i,
            /major update/i,
            /partnership/i
        ];

        return importantPatterns.some(pattern => pattern.test(text));
    }

    // 分析情感
    analyzeSentiment(text) {
        const positiveWords = ['launch', 'listing', 'partnership', 'growth', 'upgrade', 'success'];
        const negativeWords = ['delisting', 'maintenance', 'down', 'issue', 'problem', 'delay'];

        const positiveCount = positiveWords.filter(word => text.includes(word)).length;
        const negativeCount = negativeWords.filter(word => text.includes(word)).length;

        if (positiveCount > negativeCount) return 'positive';
        if (negativeCount > positiveCount) return 'negative';
        return 'neutral';
    }

    // 评估市场影响
    assessMarketImpact(text, metrics) {
        const { retweet_count, reply_count, like_count } = metrics;
        const engagement = retweet_count + reply_count + like_count;

        if (this.isImportantAnnouncement(text)) {
            if (engagement > 1000) return 'high';
            if (engagement > 100) return 'medium';
        }

        return 'low';
    }

    async sendTradeNotification(trade) {
        try {
            const { symbol, direction, price, amount, reason } = trade;
            const directionText = direction === 'long' ? '买入' : '卖出';
            const emoji = direction === 'long' ? '📈' : '📉';
            
            const tweet = `${emoji} 交易通知\n\n` +
                `交易对: ${symbol}\n` +
                `方向: ${directionText}\n` +
                `价格: ${price}\n` +
                `数量: ${amount}\n` +
                `原因: ${reason}\n\n` +
                `#加密货币 #交易 #${symbol.replace('_', '')}`;

            // 这里可以添加实际的 Twitter API 调用
            // 目前只是模拟发送
            logger.info('发送交易通知推文:', tweet);
            
            return true;
        } catch (error) {
            logger.error('发送交易通知推文失败:', error);
            return false;
        }
    }
}

module.exports = TwitterService; 