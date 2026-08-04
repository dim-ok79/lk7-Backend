const express = require('express');
const execute =  require('../utils/execute')
const app = express();
const logger = require('../utils/logger')('route-history');
const jwt = require('jsonwebtoken');
const format = require("../utils/format");
const cfg = require('../config');

const sql_get_history_events_size = "BEGIN "+cfg.db.packageName+".get_history_events_size(:patient, :p_begin_dat, :p_end_dat, :cursor); END;";
const sql_get_history_events = "BEGIN "+cfg.db.packageName+".get_history_events(:patient, :p_begin_dat, :p_end_dat, :start, :end, :cursor); END;";

/**
 * @api {get} /history/events/size 1) Количество посещений пациента (TOKEN)
 * @apiGroup history
 * @apiVersion 0.0.1
 *
 * @apiHeader {String} Authorization Authorization: TOKEN *AUTH_TOKEN*
 * @apiParam {String} beginDate  Дата с (формат даты YYYY-MM-DD = 2015-02-01)
 * @apiParam {String} endDate  Дата по (формат даты YYYY-MM-DD = 2015-02-01)
 *
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */

app.get("/history/events/size", global.acsToken, function(req,res) {
    let user = global.getAuthUser(req);
    let params = {patient: user.patient_id, p_begin_dat: null, p_end_dat: null};
    if (req.query) {
        if (req.query.beginDate) { params.p_begin_dat = req.query.beginDate; }
        if (req.query.endDate)   { params.p_end_dat = req.query.endDate;     }

        execute.executeRes(sql_get_history_events_size, params)
            .then(result => {
                let r = format.assocArrayFromJSON(result);
                res.json(format.getFormatRes(true, r[0], null));
            })
            .catch(err => {
                res.json(format.getFormatRes(false, null, err));
            });

    } else {
        res.json(format.getFormatRes(false, null, 'Not params'));
    }
});

/**
 * @api {get} /history/events 2) Список посещений пациента (TOKEN)
 * @apiGroup history
 * @apiVersion 0.0.1
 *
 * @apiHeader {String} Authorization Authorization: TOKEN *AUTH_TOKEN*
 *
 * @apiParam {Number} start  Пагинация, с какой записи
 * @apiParam {Number} end  Пагинация, по какую запись
 * @apiParam {String} beginDate  Дата с (формат даты YYYY-MM-DD = 2015-02-01)
 * @apiParam {String} endDate  Дата по (формат даты YYYY-MM-DD = 2015-02-01)
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */
app.get("/history/events", global.acsToken, function(req,res) {
    let user = global.getAuthUser(req);
    let params = {patient: user.patient_id, p_begin_dat: null, p_end_dat: null, start: null, end: null};

    if (req.query) {
        if (req.query.start)  { params.start = req.query.start};
        if (req.query.end)  { params.end = req.query.end};
        if (req.query.beginDate)  { params.p_begin_dat = req.query.beginDate};
        if (req.query.endDate)  { params.p_end_dat = req.query.endDate};

        execute.executeRes(sql_get_history_events, params)
            .then(result => {
                let r = format.assocArrayFromJSON(result);
                res.json(format.getFormatRes(true, r, null));
//                res.json(format.getFormatRes(true, format.assocArrayFromJSON(result), null));
            })
            .catch(err => {
                res.json(format.getFormatRes(false, null, err));
            });

    } else {
        res.json(format.getFormatRes(false, null, 'Not params'));
    }
});

module.exports = app;
