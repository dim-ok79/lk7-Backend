/*try {*/
    const cfg = require('./config');
    /*const path = require('path');*/
    const express = require('express');
    const cors = require('cors');
    const bodyParser = require('body-parser');
    process.setMaxListeners(0); // От предупреждения MaxListenersExceededWarning
    const app = express();
    const route_index = require('./routes/index');
    const http = require('http');
    const logger = require('./utils/logger')('index');
    const template = require('./utils/template');
    const https = require('https');
    const fs = require('fs');

/*
} catch (err) {
    console.error('Ошибка при подключении модулей ERR=', err)
}
*/


global.app_config = {};

global.log = true; // Включить логирование (Добавил при работе с БД)
// Разрешаем серверу запросы извне c адресов указанных в corse
if (cfg.server.cors) {
    logger.info('Разрешенные подключения = '+ JSON.stringify(cfg.server.cors));
} else {
    logger.info('Разрешенные подключения = НЕТ');
}
if (cfg.server.cors && cfg.server.cors.length > 0){
    app.use(cors({ origin: cfg.server.cors}));
} else {
    app.use(cors());
}

// app.use(cors({credentials: true, origin: cfg.server.cors}));
// app.use(cors({ origin: cfg.server.cors}));

app.use(bodyParser.json({limit: '5mb'}));
app.use(bodyParser.urlencoded({extended: true,limit: '5mb' }));

// Старт API
let server;
// Проверка на SSL - HTTPS
    if (cfg.server && cfg.server.https && cfg.server.https.file_certificate && cfg.server.https.file_privateKey) {
        // HTTPS
        try {
            var privateKey  = fs.readFileSync(cfg.server.https.file_privateKey, 'utf8');
            logger.info('SSL загрузка privateKey:'+ cfg.server.https.file_privateKey);
        } catch (err) {
            logger.error('Ошибка SSL, файла приватного ключа:'+ JSON.stringify(err));
        }
        try {
            var certificate = fs.readFileSync(cfg.server.https.file_certificate, 'utf8');
            logger.info('SSL загрузка certificate:'+ cfg.server.https.file_certificate);
        } catch (err) {
            logger.error('Ошибка SSL, файла сертификата:'+ JSON.stringify(err));
        }

        var credentials = {};
        if (cfg.server.https.passphrase){
            credentials = {key: privateKey, cert: certificate, passphrase: cfg.server.https.passphrase};   // С паролем
        } else {
            credentials = {key: privateKey, cert: certificate};   // Без пароля
        }

        try {
            server = https.createServer(credentials, app);
        } catch (err) {
            logger.error('HTTPS ERROR:' + JSON.stringify(err));
            process.exit(1); // Non-zero failure code
        };

    } else {
        // HTTP
        server = http.createServer(app);
    }

server.listen(cfg.server.port, cfg.server.host);
server.on('error', onError);
server.on('listening', onListening);

// oracle connect
const database =  require('./utils/database');
const dbService = new database.DBService();
dbService.init()
    .then(() => {
        logger.info(`Инициализированн модуль БД`);

        app.use('*', (req, res, next) => {
            logger.info(req.originalUrl)
            try {
                logger.info(JSON.stringify(req.headers))
            } catch (e) {
                logger.error('Err Json format headers' + e);
            }
            next()
        })
        global.dbService = dbService;
        global.log = false;
        console.log('12312');
        template.readAppConfig()
            .then(res =>{
                try {
                  global.app_config = JSON.parse(res);
                  global.log = true;
                  app.use(route_index);
                } catch (err) {
                    console.error('Ошибка JSON=', err);
                    logger.error('Ошибка JSON=' + JSON.stringify(err));
                    process.exit(1);
                }
            })
            .catch(err => {
                global.log = true;
                console.error('Ошибка readAppConfig=', err)
                logger.error(JSON.stringify(err));
                process.exit(1);
            });
    }).catch((err) => {
        console.error('Error init DB ORACLE:', err);
        logger.error(JSON.stringify(err));
        process.exit(1); // Non-zero failure code
});

/*
 * серверные обработчики
 */
function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }
    const bind = `${error.address}:${error.port}`;
    switch (error.code) {
        case 'EACCES':
            logger.error(`${bind} нет привилегий`);
            process.exit(1);
            break;
        case 'EADDRINUSE':
            logger.error(`${bind}  порт занят`);
            process.exit(1);
            break;
        default:
            throw error;
    }
}

function onListening() {
    var addr = server.address();
    let protokol = 'http://';
    if (server && server.key && server.cert){
        protokol = 'https://';
    };
    var bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : protokol + addr.address + ':' + addr.port;
    logger.info(`Server LK7-API start on ${bind}`);
    if (cfg && cfg.log_url_list) {
        logger.info(`Список логирования URL: ${JSON.stringify(cfg.log_url_list)}`);
    } else {
        logger.info(`Список логирования URL: НЕТ`);
    }

}

