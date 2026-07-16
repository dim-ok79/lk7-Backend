const oracledb = require("oracledb");
const cfg = require('../config');
const logger = require('../utils/logger')('database');
//let cfg;
oracledb.fetchAsString = [ oracledb.CLOB];
oracledb.fetchAsBuffer = [ oracledb.BLOB ];  // Для документов

// oracledb.initOracleClient({ libDir: cfg.db.libDir });

const sql_set_context_userid = "BEGIN "+cfg.db.packageName+".set_context_userid(); END;";

function logInfo(mes){ // Промежуточноая проверка логирования
    if (global.log && global.log == true) {
        logger.info(mes);
    }
}

class DBService {

    constructor() {
        try {
            oracledb.initOracleClient({ libDir: cfg.db.libDir });
        } catch (err) {
            console.error('Error INIT Oracle:', err);
            logger.error('Error INIT Oracle:' + JSON.stringify(err));
            process.exit(1);
        }
    }

    async storedProc(statement, params) {
        logInfo('storedProc sql:' + JSON.stringify(statement));
        logInfo('storedProc params:' + JSON.stringify(params));
        const bindings = params.reduce((acc, param) => {
            acc[param.name] = {
                dir: param.dir || oracledb.BIND_IN,
                type: param.type,
                val: param.value,
            };
            return acc;
        }, {});
        const executeOptions = {
            outFormat: oracledb.OUT_FORMAT_OBJECT,
            autoCommit: true,
        };

        let conn;
        const resultSets = [];
        let p_callTimeout = 60;
        if (cfg.db.callTimeout) {
            p_callTimeout = cfg.db.callTimeout;
        }
        return this._connectionPool.getConnection()
            .then(c => {
                conn = c;
                conn.callTimeout = p_callTimeout * 1000;  // 120 сек
                return conn.execute(statement, bindings, executeOptions);
            }, err => {
                logInfo('DBService: Error getting connection from the pool');
                throw err;
            })
            .then(result => {
                const outParams = params.filter(param => param.dir === oracledb.BIND_OUT || param.dir === oracledb.BIND_INOUT);
                const promises = [];

// console.log('DBService: outParams', outParams);
                const out = outParams.reduce((acc, param) => {
// console.log('param.name=', param.name);
                    const outBind = result.outBinds[param.name];
                    if (param.type === oracledb.CURSOR) {
                        acc.promises.push(param.name);
                        resultSets.push(outBind);
                        if (cfg.db.cursorCountRec && cfg.db.cursorCountRec>1){
                            promises.push(outBind.getRows(cfg.db.cursorCountRec));
                        } else {
                            promises.push(outBind.getRows(99999));
                        }
                    }
                    else {
                        acc.values[param.name] = outBind;
                    }
                    logInfo('DBService: result:' + JSON.stringify(acc));
                    return acc;
                }, { values: {}, promises: [] });
                promises.unshift(Promise.resolve(out));
                return Promise.all(promises);
            }).then(results => {
                const values = results[0].values;
                results[0].promises.forEach((outParam, idx) => {
                    values[outParam] = results[idx + 1];
                });
//                key.toLowerCase()
                // this._connectionPool._logStats();
                return values;
            }, err => {
                throw err;
            }).finally(() => {
                const rsPromise = [];
                resultSets.forEach(rs => rsPromise.push(rs.close()));
                Promise.all(rsPromise).then(() => {
                    if (conn) {
                        conn.close().then(() => {
                            logInfo('Connection closed');
                        });
                    }
                });
            });
    }
    createStatement(name, params) {
        const inlineParams = params.map(p => `:${p.name}`).join(', ');
        return `BEGIN ${name}(${inlineParams}); END;`;
    }
    close() {
        return this._connectionPool.close();
    }
    async init() {
        const poolConfig = {
            user: cfg.db.username,
            password: cfg.db.userpass,
            connectString: `(DESCRIPTION = (ADDRESS_LIST = (ADDRESS = (PROTOCOL = TCP)(HOST = ${cfg.db.host})(PORT = ${cfg.db.port}))) (CONNECT_DATA = (SERVICE_NAME = ${cfg.db.servername}) ))`,
            externalAuth  : false,
            poolMin: 10,
            poolMax: 10,
        }
        this._connectionPool = await oracledb.createPool(poolConfig)
        logger.info('Connection pool initialized: ' + JSON.stringify(poolConfig));
//        this.context_userid();
    }

/* Выполняется в нутри процедур
    context_userid(){
        this.storedProc(sql_set_context_userid, [])  // paramsL
            .then(responseData => {
                logger.info('INIT - context_userid');
            }).catch((err) => {
            logger.info('INIT ERROR - context_userid' + JSON.stringify(err));
        });
    }
*/

}

module.exports.DBService = DBService;
