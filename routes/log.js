const express = require('express');
const execute =  require('../utils/execute')
const app = express();
const logger = require('../utils/logger')('route-log');
const format = require("../utils/format");
const cfg = require('../config');

const sql_get_log_by_patient_size = "BEGIN "+cfg.db.packageName+".get_log_by_patient_size(:patient, :begin_date, :end_date, :cursor); END;";
const sql_get_log_by_patient = "BEGIN "+cfg.db.packageName+".get_log_by_patient(:patient, :begin_date, :end_date, :rec_start, :rec_end, :cursor); END;";


/**
 * @api {get} /log/size Количество записей - Активность пользователя (TOKEN)
 * @apiGroup log
 * @apiVersion 0.0.1
 * @apiHeader {String} Authorization Authorization: TOKEN AUTH_TOKEN *
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */
app.get("/log/size", global.acsToken, function(req,res) {
    let user = global.getAuthUser(req);
    let params = {patient: user.patient_id, begin_date: null, end_date: null};
    if (req.query) {
        if (req.query.beginDate)  { params.begin_date = req.query.beginDate};
        if (req.query.endDate)  { params.end_date = req.query.endDate};
    }
    execute.executeRes(sql_get_log_by_patient_size, params)
        .then(result => {
            let r = format.assocArrayFromJSON(result);
            res.json(format.getFormatRes(true, r[0], null));
        })
        .catch(err => {
            res.json(format.getFormatRes(false, null, err));
        });
});

/**
 * @api {get} /log/rec Список активности пользователя (TOKEN)
 * @apiName  Активность пользователя
 * @apiGroup log
 * @apiVersion 0.0.1
 *
 * @apiHeader {String} Authorization Authorization: TOKEN AUTH_TOKEN *
 *
 * @apiParam {String} beginDate  Дата с (формат даты YYYY-MM-DD = 2015-02-01)
 * @apiParam {String} endDate  Дата по (формат даты YYYY-MM-DD = 2015-02-01)
 * @apiParam {Number} [rec_start]  Пагинация, с какой записи
 * @apiParam {Number} [rec_end]  Пагинация, по какую запись
 *
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */
app.get("/log/rec", global.acsToken, function(req,res) {
    let user = global.getAuthUser(req);
    let params = {patient: user.patient_id, begin_date: null, end_date: null, rec_start: null, rec_end: null};
    if (req.query) {
        if (req.query.beginDate)  { params.begin_date = req.query.beginDate};
        if (req.query.endDate)  { params.end_date = req.query.endDate};
        if (req.query.start)  { params.rec_start = req.query.start};
        if (req.query.end)  { params.rec_end = req.query.end};
     }

    execute.executeRes(sql_get_log_by_patient, params)
        .then(result => {
            let r = format.assocArrayFromJSON(result);
            res.json(format.getFormatRes(true, r, null));
        })
        .catch(err => {
            res.json(format.getFormatRes(false, null, err));
        });
});


module.exports = app;

