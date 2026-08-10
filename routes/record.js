const express = require('express');
const execute =  require('../utils/execute')
const app = express();
const logger = require('../utils/logger')('route-record');
const format = require("../utils/format");
const cfg = require('../config');

const sql_get_rnumb_info = "BEGIN "+cfg.db.packageName+".get_rnumb_info(:p_rnumb_id , :cursor); END;";

const sql_set_numb_blstatus = "BEGIN "+cfg.db.packageName+".set_numb_blstatus(:p_rnumb_id, :p_patient_id , :cursor); END;";
const sql_patient_appointment = "BEGIN "+cfg.db.packageName+".patient_appointment(:p_patient_id, :p_rnumb_id, :p_srv_id , :cursor); END;";
const sql_rnumb_attrs = "BEGIN "+cfg.db.packageName+".rnumb_attrs(:p_rnumb_id, :p_srv_ids, :cursor); END;";

const sql_cancel_appointment = "BEGIN "+cfg.db.packageName+".cancel_appointment(:p_patient_id, :p_rnumb_id, :cursor); END;";
const sql_get_serv_list_by_rnumb = "BEGIN "+cfg.db.packageName+".get_serv_list_by_rnumb(:p_rnumb_id, :cursor); END;";
const sql_set_numb_unlock_status = "BEGIN "+cfg.db.packageName+".set_numb_unlock_status(:p_rnumb_id, :cursor); END;";


/**
 * @api {get} /record/rnumb/info 6) информация о талоне (TOKEN)
 * @apiGroup record
 * @apiVersion 0.0.1
 *
 * @apiHeader {String} Authorization Authorization: TOKEN AUTH_TOKEN *
 * @apiParam {Number} rnumbID  ID талона
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */
app.get("/record/rnumb/info", global.acsToken, function(req,res) {
    if (req.query.rnumbID) {
        execute.executeRes(sql_get_rnumb_info, {p_rnumb_id: req.query.rnumbID})
            .then(result => {
                const tmp = format.assocArrayFromJSON(result);
                res.json(format.getFormatRes(true, tmp, null));
                // TEST
                /*
                                setTimeout( function() {
                                        res.json(format.getFormatRes(true, tmp, null));
                                    },9000
                                );
                */

            })
            .catch(err => {
                res.json(format.getFormatRes(false, null, err));
            });
    } else {
        res.json(format.getFormatRes(false, null, 'Not params'));
    }
});

/**
 * @api {get} /record/rnumb/blstatus 7) Блокировка талона (TOKEN)
 * @apiGroup record
 * @apiVersion 0.0.1
 *
 * @apiHeader {String} Authorization Authorization: TOKEN AUTH_TOKEN *
 * @apiParam {Number} rnumbID  ID талона
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */
app.get("/record/rnumb/blstatus", global.acsToken, function(req,res) {
    let user = global.getAuthUser(req);
    if (req.query.rnumbID) {
        execute.executeRes(sql_set_numb_blstatus, {p_rnumb_id: req.query.rnumbID, p_patient_id: user.patient_id})
            .then(result => {
                const tmp = format.assocArrayFromJSON(result);
                res.json(format.getFormatRes(true, tmp[0], null));
            })
            .catch(err => {
                res.json(format.getFormatRes(false, null, err));
            });
    } else {
        res.json(format.getFormatRes(false, null, 'Not params'));
    }
});

/**
 * @api {get} /record/rnumb/appointment 8) Запись пациента на талон (TOKEN)
 * @apiGroup record
 * @apiVersion 0.0.1
 *
 * @apiHeader {String} Authorization Authorization: TOKEN AUTH_TOKEN *
 * @apiParam {Number} rnumbID  ID талона
 * @apiParam {Number} [srvID]  ID услуги
 *
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */

app.get("/record/rnumb/appointment", global.acsToken, function(req,res) {
    let user = global.getAuthUser(req);
    if (req.query.rnumbID) {
        let params = {p_patient_id: user.patient_id, p_rnumb_id: req.query.rnumbID, p_srv_id: null};
        if (req.query.srvID) {
            params.p_srv_id = req.query.srvID;
        }
        execute.executeRes(sql_patient_appointment, params)
            .then(result => {
                const tmp = format.assocArrayFromJSON(result);
                res.json(format.getFormatRes(true, tmp[0], null));
                global.LogUrl(req, 1);
            })
            .catch(err => {
                res.json(format.getFormatRes(false, null, err));
                global.LogUrl(req, 0);
            });
    } else {
        res.json(format.getFormatRes(false, null, 'Not params'));
    }
});

/**
 * @api {get} /record/rnumb/attrs 8.1) Получение аттрибутов талона (TOKEN)
 * @apiGroup record
 * @apiVersion 0.0.1
 *
 * @apiHeader {String} Authorization Authorization: TOKEN AUTH_TOKEN *
 * @apiParam {Number} rnumbID  ID талона
 * @apiParam {String} [srvID]  ID услуг (возможно несколько услуг с разделителем ",")
 *
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */

//  :p_srv_ids
app.get("/record/rnumb/attrs", global.acsToken, function(req,res) {
    let user = global.getAuthUser(req);
    if (req.query.rnumbID){
        let params = {p_rnumb_id: req.query.rnumbID, p_srv_ids: null};
        if (req.query.srvID) {
            params.p_srv_ids = req.query.srvID;
        }
        execute.executeRes(sql_rnumb_attrs, params)
            .then(result => {
                const tmp = format.assocArrayFromJSON(result);
                res.json(format.getFormatRes(true, tmp[0], null));
            })
            .catch(err => {
                res.json(format.getFormatRes(false, null, err));
            });
    } else {
        res.json(format.getFormatRes(false, null, 'Not params'));
    }
});

/**
 * @api {get} /record/rnumb/cancel 10)Отмена записи к специалисту (TOKEN)
 * @apiGroup record
 * @apiVersion 0.0.1
 *
 * @apiHeader {String} Authorization Authorization: TOKEN AUTH_TOKEN *
 * @apiParam {Number} [rnumbID]  ID Номерка
 *
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */
app.get("/record/rnumb/cancel", global.acsToken, function(req,res) {
    let user = global.getAuthUser(req);
    if (req.query.rnumbID) {
        let params = {p_patient_id: user.patient_id, p_rnumb_id: req.query.rnumbID};
        execute.executeRes(sql_cancel_appointment, params)
            .then(result => {
                const tmp = format.assocArrayFromJSON(result);
                res.json(format.getFormatRes(true, tmp[0], null));
                if (tmp[0] && tmp[0].err_code ==0){
                    global.LogUrl(req, 1);
                } else {
                    global.LogUrl(req, 0);
                }

            })
            .catch(err => {
                res.json(format.getFormatRes(false, null, err));
                global.LogUrl(req, 0);
            });
    } else {
        res.json(format.getFormatRes(false, null, 'Not params'));
    }
});

/**
 * @api {get} /record/rnumb/unlock 11)Разблокировка талона (TOKEN)
 * @apiGroup record
 * @apiVersion 0.0.1
 *
 * @apiHeader {String} Authorization Authorization: TOKEN AUTH_TOKEN *
 * @apiParam {Number} [rnumbID]  ID Номерка
 *
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */
app.get("/record/rnumb/unlock", global.acsToken, function(req,res) {
//    let user = global.getAuthUser(req);
    if (req.query.rnumbID) {
        let params = { p_rnumb_id: req.query.rnumbID};
        execute.executeRes(sql_set_numb_unlock_status, params)
            .then(result => {
                const tmp = format.assocArrayFromJSON(result);
                res.json(format.getFormatRes(true, tmp[0], null));
            })
            .catch(err => {
                res.json(format.getFormatRes(false, null, err));
            });
    } else {
        res.json(format.getFormatRes(false, null, 'Not params'));
    }
});



/**
 * @api {get} /record/rnumb/serv 12)Список услуг к номерку (TOKEN)
 * @apiGroup record
 * @apiVersion 0.0.1
 *
 * @apiHeader {String} Authorization Authorization: TOKEN AUTH_TOKEN *
 * @apiParam {Number} [rnumbID]  ID Номерка
 *
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */
app.get("/record/rnumb/serv", global.acsToken, function(req,res) {
    if (req.query.rnumbID) {
        let params = {p_rnumb_id: req.query.rnumbID};
        execute.executeRes(sql_get_serv_list_by_rnumb, params)
            .then(result => {
                const tmp = format.assocArrayFromJSON(result);
                res.json(format.getFormatRes(true, tmp[0], null));
            })
            .catch(err => {
                res.json(format.getFormatRes(false, null, err));
            });
    } else {
        res.json(format.getFormatRes(false, null, 'Not params'));
    }
});

module.exports = app;
