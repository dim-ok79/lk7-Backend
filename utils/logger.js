const appRoot = require('app-root-path');
const winston = require('winston');
const moment = require('moment');
const cfg = require('../config');


// const logFileName =`${appRoot}/log/${new Date().toLocaleDateString()}.log`;
const logFileName =`${appRoot}/log/${moment(new Date).format('YYYY-MM-DD-HH_mm_ss')}.log`;
const logErrFileName =`${appRoot}/log/ERR-${moment(new Date).format('YYYY-MM-DD-HH_mm_ss')}.log`;
// moment(new Date).format('YYYY-MM-DD');
// console.log('logFileName=', logFileName);


const formattedObject = (data) => {
    if (typeof data !== "object" || typeof data === "undefined") {
        return data
    }
    const parseObject = line => {
        let output = '';
        for (let property in line) {
            output += property + ': ' + line[property]+'; ';
        }
        return output
    }
    if (typeof data.map !== "function") {
        return parseObject(data)
    }
    return '\n'+ data.map(parseObject).join('\n')
};

/* Формат в файле */
const logFormat = winston.format.printf(info => `${new Date().toLocaleTimeString()} [${info.level}]${info.label}: ${info.message} ${info.metadata.detail ? formattedObject(info.metadata.detail) :''}`);
/* Формат в консоле */
const logFormatConsole = winston.format.printf(info => `${info.label}: ${info.message} ${info.metadata.detail ? formattedObject(info.metadata.detail) :''}`);

const {console} = {
    console: {
        level:'debug',
        handleExceptions: true,
        colorize: true,
    },
};

let logger = function(nameModule) {
    return winston.createLogger({
        transports: [
            new (winston.transports.File)({
                name: 'error',
                filename: logErrFileName,
                level: 'error',
                json: false
            }),
            new winston.transports.File(
                {
                    level: 'info',
                    filename: logFileName,
                    handleExceptions: true,
//                    json: true,
                    maxsize: cfg.log.maxsize, // 5242880 = 5MB
                    maxFiles: cfg.log.maxFiles,
                    colorize: true,
                    format: winston.format.combine(
//                        winston.format.colorize({all: false, message:false, level: false}),
                        winston.format.label({ label: nameModule}),
                        winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
                        logFormat
                    ),
                }
            ),
            new winston.transports.Console(
                {
                    level: 'info',
                    colorize: true,
                    format: winston.format.combine(
                        winston.format.colorize({all: true}),
                        winston.format.label({ label: nameModule}),
                        winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
                        logFormatConsole
                    ),
                }
            )
        ],
        exitOnError: false, // do not exit on handled exceptions
    });
}

module.exports = logger;
