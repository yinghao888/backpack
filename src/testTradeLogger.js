const TradeLogger = require('./tradeLogger');
const logger = require('./logger');

async function testTradeLogger() {
    try {
        logger.info('开始测试TradeLogger...');
        
        // 创建TradeLogger实例
        const tradeLogger = new TradeLogger();
        
        // 测试用例1：正常买入交易
        const buyTrade = {
            symbol: 'SOL_USDC',
            direction: 'long',
            price: '100.5',
            amount: '0.1',
            reason: '测试买入交易',
            exchange: 'backpack'
        };
        
        logger.info('测试用例1：买入交易');
        const buyResult = await tradeLogger.logTrade(buyTrade);
        logger.info(`买入交易记录结果: ${buyResult ? '成功' : '失败'}`);
        
        // 测试用例2：正常卖出交易
        const sellTrade = {
            symbol: 'SOL_USDC',
            direction: 'short',
            price: '101.2',
            amount: '0.1',
            reason: '测试卖出交易',
            exchange: 'backpack'
        };
        
        logger.info('测试用例2：卖出交易');
        const sellResult = await tradeLogger.logTrade(sellTrade);
        logger.info(`卖出交易记录结果: ${sellResult ? '成功' : '失败'}`);
        
        // 测试用例3：缺少必要字段的交易
        const invalidTrade = {
            symbol: 'SOL_USDC',
            // 缺少direction
            price: '100.5',
            amount: '0.1',
            reason: '测试无效交易'
        };
        
        logger.info('测试用例3：无效交易');
        const invalidResult = await tradeLogger.logTrade(invalidTrade);
        logger.info(`无效交易记录结果: ${invalidResult ? '成功' : '失败'}`);
        
        // 测试用例4：完整的交易记录
        const completeTrade = {
            id: `trade_${Date.now()}_test`,
            symbol: 'SOL_USDC',
            exchange: 'backpack',
            direction: 'long',
            price: '100.5',
            amount: '0.1',
            status: 'open',
            openTime: Date.now(),
            closeTime: null,
            reason: '测试完整交易记录',
            orderStatus: 'filled',
            orderDetails: {
                orderType: 'LIMIT',
                clientId: 'test_client_id',
                executedQuantity: '0.1',
                executedQuoteQuantity: '10.05',
                quantity: '0.1',
                quoteQuantity: '10.05',
                side: 'BUY',
                timeInForce: 'GTC',
                selfTradePrevention: 'NONE'
            }
        };
        
        logger.info('测试用例4：完整交易记录');
        const result = await tradeLogger.logTrade(completeTrade);
        logger.info(`交易记录结果: ${result ? '成功' : '失败'}`);
        
        // 测试用例5：更新交易记录
        logger.info('测试用例5：更新交易记录');
        const updates = {
            status: 'closed',
            closeTime: Date.now(),
            exitPrice: '102.5',
            exitReason: '止盈',
            profitLoss: '1.99',
            profitAmount: '0.199'
        };
        
        try {
            await tradeLogger.updateTrade('SOL_USDC', 'backpack', completeTrade.id, updates);
            logger.info('交易记录更新成功');
            
            // 验证更新后的记录
            const updatedTrades = await tradeLogger.getTradeHistory('SOL_USDC', 'backpack');
            const updatedTrade = updatedTrades.find(t => t.id === completeTrade.id);
            
            if (updatedTrade) {
                logger.info('更新后的交易记录:');
                logger.info(`- 交易ID: ${updatedTrade.id}`);
                logger.info(`- 交易状态: ${updatedTrade.status}`);
                logger.info(`- 平仓价格: ${updatedTrade.exitPrice}`);
                logger.info(`- 平仓原因: ${updatedTrade.exitReason}`);
                logger.info(`- 盈亏比例: ${updatedTrade.profitLoss}%`);
                logger.info(`- 盈亏金额: ${updatedTrade.profitAmount} USDT`);
                logger.info(`- 平仓时间: ${new Date(parseInt(updatedTrade.closeTime)).toLocaleString()}`);
            }
        } catch (error) {
            logger.error('更新交易记录失败:', error.message);
        }
        
        // 验证交易记录是否已保存
        logger.info('验证交易记录...');
        const trades = await tradeLogger.getTradeHistory('SOL_USDC', 'backpack');
        logger.info(`获取到的交易记录数量: ${trades.length}`);
        
        if (trades.length > 0) {
            logger.info('最新交易记录详情:');
            const latestTrade = trades[trades.length - 1];
            logger.info(`- 交易ID: ${latestTrade.id}`);
            logger.info(`- 交易对: ${latestTrade.symbol}`);
            logger.info(`- 方向: ${latestTrade.direction}`);
            logger.info(`- 价格: ${latestTrade.price}`);
            logger.info(`- 数量: ${latestTrade.amount}`);
            logger.info(`- 状态: ${latestTrade.status}`);
            logger.info(`- 订单状态: ${latestTrade.orderStatus}`);
            logger.info(`- 开仓时间: ${new Date(parseInt(latestTrade.openTime)).toLocaleString()}`);
            
            if (latestTrade.orderDetails) {
                logger.info('订单详情:');
                const details = latestTrade.orderDetails;
                logger.info(`- 订单类型: ${details.orderType}`);
                logger.info(`- 客户端ID: ${details.clientId}`);
                logger.info(`- 执行数量: ${details.executedQuantity}`);
                logger.info(`- 订单数量: ${details.quantity}`);
                logger.info(`- 交易方向: ${details.side}`);
                logger.info(`- 有效期: ${details.timeInForce}`);
            }
            logger.info('------------------------');
        }
        
        logger.info('TradeLogger测试完成');
    } catch (error) {
        logger.error('测试过程中发生错误:', error.message);
    }
}

// 运行测试
testTradeLogger(); 