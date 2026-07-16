/*
Зарезервированные поля в запросе
:blob   - BLOB поле
, :cursor  -- Результат - курсор
 */
const oracledb = require("oracledb");
const logger = require('../utils/logger')('execute');

function logInfo(mes){ // Промежуточноая проверка логирования
    if (global.log && global.log == true) {
        logger.info(mes);
    }
}

function executeRes(query, params) {
    return new Promise((resolve, reject) => {
//
//        logger.error('ERRquery=' + JSON.stringify(query));
        logInfo('query=' + JSON.stringify(query));
        logInfo('params=' + JSON.stringify(params));
        let paramsL = [];
        for (var key in params) {
// console.log('typeof params[key]', typeof params[key]);
            switch ((typeof params[key])) {
                case "number":
                    paramsL.push({ name: key, type: oracledb.NUMBER, value:  params[key]});
                    break;
                case "object":
                    if (key == 'blob') {
                        paramsL.push({ name: key, type: oracledb.BUFFER, value:  params[key]});
                    } else {
                        paramsL.push({ name: key, type: oracledb.STRING, value:  params[key]});
                    }
//                    paramsL.push({ name: key, type: oracledb.BUFFER, value:  params[key]});
                    break;
                default:
                    paramsL.push({ name: key, type: oracledb.STRING, value:  params[key]});
            }


/*
            if ((typeof params[key]) === 'number') {
                paramsL.push({ name: key, type: oracledb.NUMBER, value:  params[key]});
            } else {
                paramsL.push({ name: key, type: oracledb.STRING, value:  params[key]});
            }
*/

        }
        paramsL.push({ name: 'cursor', type: oracledb.CURSOR, dir: oracledb.BIND_OUT });

        global.dbService.storedProc(query, paramsL)  // paramsL
            .then(responseData => {
//                logger.info('responseData=' + JSON.stringify(responseData));
                let strRes = JSON.stringify(responseData);
//                logInfo(`strRes.length:${strRes.length}`);
                if (strRes.length > 150) {
                    strRes = strRes.slice(0, 150) + '...';
                }
//                logInfo(`strRes:${strRes}`);
//                logInfo(`response ${query} RESULT:${JSON.stringify(responseData)}`);
                logInfo(`response ${query} RESULT:${strRes}`);
                if (responseData.cursor) {
                    resolve(responseData.cursor);
                } else {
                    resolve(responseData);
                }
            }).catch((err) => {
                logger.error(`SQL error proc:${query}= ${JSON.stringify(err)}`);
                // "errorNum":0,"offset":0
                console.log('ERr=', err);
                logger.error(`SQL RECONNECT`);
                global.dbService._connectionPool = null;
                global.dbService.init();
                
                logger.error(`SQL error proc params:${JSON.stringify(paramsL)}`);
                reject(err);
        });

    });
}

module.exports.executeRes = executeRes;
