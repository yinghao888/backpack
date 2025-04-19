const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class TradeLogger {
    constructor() {
        // 创建交易记录目录
        this.tradeDir = path.join(__dirname, '../backpack');
        if (!fs.existsSync(this.tradeDir)) {
            fs.mkdirSync(this.tradeDir, { recursive: true });
        }

        // 创建交易所特定的目录
        this.backpackDir = path.join(this.tradeDir, 'backpack');
        
        if (!fs.existsSync(this.backpackDir)) {
            fs.mkdirSync(this.backpackDir, { recursive: true });
        }

        logger.info('交易记录系统初始化完成');
    }

    // 获取交易记录文件路径
    getTradeFilePath(symbol, exchange) {
        const exchangeDir = exchange === 'binance' ? this.binanceDir : this.backpackDir;
        return path.join(exchangeDir, `${symbol}.csv`);
    }

    // 获取CSV头部
    getCSVHeader() {
        const headers = [
            'id',
            'symbol',
            'exchange',
            'direction',
            'price',
            'amount',
            'status',
            'openTime',
            'closeTime',
            'reason',
            'orderStatus',
            'exitPrice',
            'exitReason',
            'profitLoss',
            'profitAmount'
        ];
        return headers.join(',');
    }

    // 将交易对象转换为CSV行
    tradeToCSV(trade) {
        // 确保时间戳是数字
        const openTime = trade.openTime ? Number(trade.openTime) : null;
        const closeTime = trade.closeTime ? Number(trade.closeTime) : null;
        const timestamp = trade.timestamp ? Number(trade.timestamp) : Date.now();

        const fields = [
            trade.id || '',
            trade.symbol || '',
            trade.exchange || '',
            trade.direction || '',
            trade.price || '',
            trade.amount || '',
            trade.status || '',
            openTime || '',
            closeTime || '',
            trade.reason || '',
            trade.orderStatus || '',
            trade.exitPrice || '',
            trade.exitReason || '',
            trade.profitLoss || '',
            trade.profitAmount || ''
        ];
        
        // 直接返回逗号分隔的字段，不添加双引号
        return fields.join(',');
    }

    // 保存交易记录
    async saveTrade(trade) {
        try {
            const { symbol, exchange } = trade;
            const filePath = this.getTradeFilePath(symbol, exchange);
            
            // 检查文件是否存在
            const fileExists = fs.existsSync(filePath);
            
            // 准备CSV行
            const csvLine = this.tradeToCSV(trade);
            
            if (!fileExists) {
                // 如果文件不存在，创建新文件并写入头部
                const header = this.getCSVHeader();
                await fs.promises.writeFile(filePath, `${header}\n${csvLine}\n`);
            } else {
                // 如果文件存在，追加新行
                await fs.promises.appendFile(filePath, `${csvLine}\n`);
            }
            
            logger.info(`保存交易记录到 ${exchange}/${symbol}`);
        } catch (error) {
            logger.error(`保存交易记录失败: ${error.message}`);
            throw error;
        }
    }

    // 获取交易历史
    async getTradeHistory(symbol, exchange) {
        try {
            const filePath = this.getTradeFilePath(symbol, exchange);
            
            if (!fs.existsSync(filePath)) {
                return [];
            }

            const data = await fs.promises.readFile(filePath, 'utf8');
            const lines = data.split('\n').filter(line => line.trim());
            
            if (lines.length <= 1) { // 只有头部或空文件
                return [];
            }

            const header = lines[0].split(',');
            return lines.slice(1).map(line => {
                const values = line.split(',');
                const trade = {};
                header.forEach((key, index) => {
                    let value = values[index] || '';
                    
                    if (key === 'openTime' || key === 'closeTime' || key === 'timestamp') {
                        trade[key] = value ? Number(value) : null;
                    } else {
                        trade[key] = value;
                    }
                });
                return trade;
            });
        } catch (error) {
            logger.error(`获取交易历史失败: ${error.message}`);
            return [];
        }
    }

    // 更新交易记录
    async updateTrade(symbol, exchange, tradeId, updates) {
        try {
            const filePath = this.getTradeFilePath(symbol, exchange);
            
            if (!fs.existsSync(filePath)) {
                throw new Error('交易记录文件不存在');
            }

            const data = await fs.promises.readFile(filePath, 'utf8');
            const lines = data.split('\n').filter(line => line.trim());
            
            if (lines.length <= 1) {
                throw new Error('交易记录文件为空');
            }

            const header = lines[0].split(',').map(h => h.replace(/"/g, ''));
            const trades = lines.slice(1).map(line => {
                const values = line.split(',').map(v => v.replace(/"/g, ''));
                const trade = {};
                header.forEach((key, index) => {
                    if (key === 'orderDetails') {
                        trade[key] = JSON.parse(values[index] || '{}');
                    } else {
                        trade[key] = values[index];
                    }
                });
                return trade;
            });

            // 查找并更新交易记录
            const tradeIndex = trades.findIndex(t => t.id === tradeId);
            if (tradeIndex === -1) {
                throw new Error('交易记录不存在');
            }

            trades[tradeIndex] = {
                ...trades[tradeIndex],
                ...updates
            };

            // 重新写入所有记录
            const headerLine = this.getCSVHeader();
            const tradeLines = trades.map(trade => this.tradeToCSV(trade));
            await fs.promises.writeFile(filePath, `${headerLine}\n${tradeLines.join('\n')}\n`);
            
            logger.info(`更新交易记录 ${exchange}/${symbol}/${tradeId}`);
        } catch (error) {
            logger.error(`更新交易记录失败: ${error.message}`);
            throw error;
        }
    }

    // 获取所有交易记录
    async getAllTrades(exchange) {
        try {
            const exchangeDir = exchange === 'binance' ? this.binanceDir : this.backpackDir;
            const files = await fs.promises.readdir(exchangeDir);
            
            const allTrades = [];
            for (const file of files) {
                if (file.endsWith('.csv')) {
                    const symbol = file.replace('.csv', '');
                    const trades = await this.getTradeHistory(symbol, exchange);
                    allTrades.push(...trades);
                }
            }
            
            return allTrades;
        } catch (error) {
            logger.error(`获取所有交易记录失败: ${error.message}`);
            return [];
        }
    }

    // 清理过期的交易记录
    async cleanupOldTrades(exchange, daysToKeep = 30) {
        try {
            const exchangeDir = exchange === 'binance' ? this.binanceDir : this.backpackDir;
            const files = await fs.promises.readdir(exchangeDir);
            
            const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
            
            for (const file of files) {
                if (file.endsWith('.csv')) {
                    const filePath = path.join(exchangeDir, file);
                    const trades = await this.getTradeHistory(file.replace('.csv', ''), exchange);
                    
                    // 过滤掉过期的交易记录
                    const recentTrades = trades.filter(trade => trade.timestamp > cutoffTime);
                    
                    // 重新写入所有记录
                    if (recentTrades.length > 0) {
                        const headerLine = this.getCSVHeader();
                        const tradeLines = recentTrades.map(trade => this.tradeToCSV(trade));
                        await fs.promises.writeFile(filePath, `${headerLine}\n${tradeLines.join('\n')}\n`);
                    } else {
                        // 如果没有记录，删除文件
                        await fs.promises.unlink(filePath);
                    }
                }
            }
            
            logger.info(`清理 ${exchange} 的过期交易记录完成`);
        } catch (error) {
            logger.error(`清理过期交易记录失败: ${error.message}`);
        }
    }

    async logTrade(trade) {
        try {
            // 验证必要字段
            if (!trade.symbol || !trade.direction || !trade.price || !trade.amount) {
                logger.error('交易记录缺少必要字段:', JSON.stringify(trade, null, 2));
                return false;
            }

            // 如果没有交易ID，生成一个
            if (!trade.id) {
                trade.id = `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }
            
            // 确保所有必要字段都存在，并且时间戳是数字类型
            const tradeWithMetadata = {
                ...trade,
                timestamp: Number(trade.timestamp) || Date.now(),
                exchange: trade.exchange || 'backpack',
                status: trade.status || 'open',
                openTime: Number(trade.openTime) || Date.now(),
                closeTime: trade.closeTime ? Number(trade.closeTime) : null,
                orderStatus: trade.orderStatus || 'unknown',
                orderDetails: trade.orderDetails ? {
                    orderType: trade.orderDetails.orderType || '',
                    clientId: trade.orderDetails.clientId || '',
                    executedQuantity: trade.orderDetails.executedQuantity || '',
                    executedQuoteQuantity: trade.orderDetails.executedQuoteQuantity || '',
                    quantity: trade.orderDetails.quantity || '',
                    quoteQuantity: trade.orderDetails.quoteQuantity || '',
                    side: trade.orderDetails.side || '',
                    timeInForce: trade.orderDetails.timeInForce || '',
                    selfTradePrevention: trade.orderDetails.selfTradePrevention || ''
                } : {}
            };

            // 保存交易记录
            await this.saveTrade(tradeWithMetadata);

            // 记录日志
            const directionText = trade.direction === 'long' ? '买入' : '卖出';
            logger.info('------------------------');
            logger.info(`交易记录: ${trade.symbol} ${directionText} ${trade.amount} @ ${trade.price}`);
            logger.info(`交易ID: ${trade.id}`);
            logger.info(`交易状态: ${trade.status || 'open'}`);
            logger.info(`订单状态: ${trade.orderStatus || 'unknown'}`);
            logger.info(`交易原因: ${trade.reason || '未知'}`);
            logger.info(`开仓时间: ${new Date(tradeWithMetadata.openTime).toLocaleString()}`);
            if (tradeWithMetadata.closeTime) {
                logger.info(`平仓时间: ${new Date(tradeWithMetadata.closeTime).toLocaleString()}`);
            }
            logger.info('------------------------');

            return true;
        } catch (error) {
            logger.error('记录交易失败:', error);
            return false;
        }
    }
}

module.exports = TradeLogger; 

