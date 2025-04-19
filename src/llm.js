const axios = require('axios');
const logger = require('./logger');

class LLMService {
    constructor() {
        this.endpoint = process.env.LLM_ENDPOINT;
        this.apiKey = process.env.DEEPSEEK_API_KEY;
        this.apiEndpoint = process.env.DEEPSEEK_API_ENDPOINT;
        this.model = process.env.DEEPSEEK_MODEL;
    }

    async analyzeMarketData(symbol, data) {
        try {
            const prompt = this.buildPrompt(symbol, data);
            const response = await this.callAPI(prompt);
            
            // 解析响应，提取决策和理由
            const analysis = this.parseResponse(response);
            return {
                action: analysis.action,
                reason: analysis.reason
            };
        } catch (error) {
            logger.error('分析市场数据失败:', error);
            throw error;
        }
    }

    parseResponse(response) {
        try {
            // 假设响应格式为 JSON
            const result = JSON.parse(response);
            return {
                action: result.action.toLowerCase(),
                reason: result.reason
            };
        } catch (error) {
            logger.error('解析响应失败:', error);
            return {
                action: 'hold',
                reason: '无法解析响应'
            };
        }
    }

    buildPrompt(symbol, data) {
        return `分析以下${symbol}的市场数据并给出交易建议：
        当前价格: ${data.price}
        24小时涨跌幅: ${data.priceChange}%
        24小时成交量: ${data.volume}
        
        请以JSON格式返回，包含以下字段：
        {
            "action": "buy/sell/hold",
            "reason": "决策理由"
        }`;
    }

    async callAPI(prompt) {
        try {
            const response = await axios.post(this.apiEndpoint, {
                model: this.model,
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.7
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data.choices[0].message.content;
        } catch (error) {
            logger.error('调用API失败:', error);
            throw error;
        }
    }
}

module.exports = LLMService; 