var winston = require('winston');

var moment = require('moment');
var fs = require('fs');
var logDir = '../log';

if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

function timeStampFormat() {
    return moment().format('YYYY-MM-DD HH:mm:ss.SSS ZZ');                            
};

var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)(),
        new (require('winston-daily-rotate-file'))({
            name: 'verbose-file',
            filename:  logDir+'/verbose-%DATE%.log',
            datePattern: 'YYYY-MM-DD-HH',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
            level: 'verbose'
        }),
        new (require('winston-daily-rotate-file'))({
            name: 'info-file',
            filename:  logDir+'/info-%DATE%.log',
            datePattern: 'YYYY-MM-DD-HH',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
            level: 'info'
        }),
        new (require('winston-daily-rotate-file'))({
            name: 'error-file',
            filename:  logDir+'/err-%DATE%.log',
            datePattern: 'YYYY-MM-DD-HH',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
            level: 'error'
        }),
        
    ],
    exceptionHandlers: [
        new (require('winston-daily-rotate-file'))({
            name: 'exception-file',
            filename:  logDir+'/exception-%DATE%.log',
            datePattern: 'YYYY-MM-DD-HH',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
        })
    ]
});

logger.cli();

exports.logger = logger
