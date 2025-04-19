const winston = require('winston');
const path = require('path');
require('source-map-support').install();
const { format } = winston;

// 添加颜色支持
const colors = {
  error: '\x1b[31m', // 红色
  warn: '\x1b[33m',  // 黄色
  info: '\x1b[32m',  // 绿色
  debug: '\x1b[36m', // 青色
  reset: '\x1b[0m'   // 重置颜色
};

// 添加行号
const addLineNumber = format((info) => {
    function getException() {
        try {
            throw Error('');
        } catch (err) {
            return err;
        }
    }
    
    const err = getException();

    const stack = err.stack;

    console.log(stack);

    const stackArr = stack.split('\n');
    let callerLogIndex = 0;
    for (let i = 0; i < stackArr.length; i++) {
        if (stackArr[i].indexOf('Map.Logger') > 0 && i + 1 < stackArr.length) {
            callerLogIndex = i + 1;
            break;
        }
    }

    if (callerLogIndex !== 0) {
        const callerStackLine = stackArr[callerLogIndex];
        info.lineNumber = `[${callerStackLine.substring(callerStackLine.lastIndexOf(path.sep) + 1, callerStackLine.lastIndexOf(':'))}]`;
    } else {
        info.lineNumber = '[-]';
    }

  return info;
});

// 添加对象格式化
const formatObject = format((info) => {
  const splatArgs = info[Symbol.for('splat')] || [];
  if (splatArgs.length > 0) {
    info.extraInfo = splatArgs.map(item => 
      typeof item === 'object' ? JSON.stringify(item, null, 2) : item
    ).join('\n');
  }
  return info;
});

const logger = winston.createLogger({
  level: 'debug',
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.splat(),
    // addLineNumber(),
    formatObject(),
    format.printf(info => {
      const color = colors[info.level] || colors.reset;
      let output = `[${info.timestamp}] ${color}[${info.level}]${colors.reset} ${info.message}`;
      if (info.extraInfo) {
        output += '\n' + info.extraInfo;
      }
      return output;
    })
  ),
  transports: [new winston.transports.Console()]
});

module.exports = logger; 