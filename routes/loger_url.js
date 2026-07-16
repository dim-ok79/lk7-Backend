const express = require('express');
const cfg = require('../config');
const format = require("../utils/format");
const app = express();
const logger = require('../utils/logger')('loger-URL');
const useragent = require('express-useragent');
const execute =  require('../utils/execute');
const jwt = require('jsonwebtoken');


const sql_server_log = "BEGIN "+cfg.db.packageName+".server_log(:p_session_id, :p_action, :p_ip_address, :p_browser, :p_os, :p_patient_id, :p_success, :p_url, :cursor); END;";

app.use(useragent.express());

/* Получение IP клиента */
getClientAddress = function (req) {
//    console.log('req.headers=', req.headers);
//    console.log('req.headers[\'x-forwarded-for\']=', req.headers['x-forwarded-for']);
    return (req.headers['x-forwarded-for'] || '').split(',')[0]
        || req.connection.remoteAddress;
};


global.LogUrl = function(req, success = 0, p_patient_id = null, p_session = null) {
//console.log('*******Logger URL');
    let user = global.getAuthUser(req);
    let token = null;
    let sessionID = null;
    if (p_session && p_session.length>1) {     // Сессия из параметра
        sessionID = p_session;
    } else {                                   // Сессия из BODY
        if (req && req.headers && req.headers.authorization){
            let r = req.headers.authorization.split(' ');
            if (r && r[1]) {
                token = req.headers.authorization.split(' ')[1];
                let tmp = global.session.findToTOKEN(token);
                if (tmp && tmp.guid) {
                    sessionID = tmp.guid;
                }
            }
        }
    }



    let patient_id = null;
    if (user && user.patient_id){
        patient_id = user.patient_id;
    }
    if (p_patient_id){
        patient_id = p_patient_id;
    }
    // Нужно логировать или нет ?
    let curentUrl = req.url;
console.log('***** curentUrl=', curentUrl);
    if (curentUrl.indexOf('?')>0) {
        curentUrl = curentUrl.slice(0, curentUrl.indexOf('?'));
    }

    if (cfg && cfg.log_url_list && cfg.log_url_list[curentUrl]){
        logger.info('LOGER - ' + cfg.log_url_list[curentUrl]);
        let params = {p_session_id: sessionID, p_action: null, p_ip_address: null, p_browser: null, p_os: null, p_patient_id: null, p_success: null, p_url: null};

        params.p_action = cfg.log_url_list[curentUrl];
        params.p_ip_address = getClientAddress(req);
        params.p_browser = `${req.useragent.browser} (${req.useragent.version})`;
        params.p_os = req.useragent.os;
        params.p_patient_id = patient_id;
        params.p_success = success;
        params.p_url = req.url;
        execute.executeRes(sql_server_log, params)
            .then(result => {
//                console.log('log SQL res=', result);
                // res.json(format.getFormatRes(true, result, null));
                logger.info('LOG ' + curentUrl+ ' RES=' + JSON.stringify(result));
            })
            .catch(err => {
                // res.json(format.getFormatRes(false, null, err));
                console.log('ERRR=', err);
                logger.error('LOG ' + curentUrl+ ' ERRR=' + JSON.stringify(err));
            });

    } else {
        logger.info('NOT LOGER URL=' + curentUrl);
//        console.log('NOT LOG=', cfg.log_url_list);
    }
}


module.exports = app;
