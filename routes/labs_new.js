const express = require('express');
const execute =  require('../utils/execute')
const app = express();
const logger = require('../utils/logger')('route-labs-new');
const format = require("../utils/format");
const getErrorHtml = require("../utils/template").getErrorHtml;
var cfg = require('../config');

const sql_get_lab_list_size = "BEGIN "+cfg.db.packageName+".get_lab_list_size(:patient, :p_begin_dat, :p_end_dat, :cursor); END;";
const sql_get_lab_list = "BEGIN "+cfg.db.packageName+".get_lab_list(:patient, :p_begin_dat, :p_end_dat, :p_start, :p_end, :cursor); END;";

/**
 * @api {get} /labs/list/size Количество лаб исследований (TOKEN)
 * @apiGroup labs
 * @apiVersion 0.0.1
 *
 * @apiHeader {String} Authorization Authorization: TOKEN *AUTH_TOKEN*
 *
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */

app.get("/labs/list/size", global.acsToken, function(req,res) {
    let user = global.getAuthUser(req);
    let params = {patient: user.patient_id, p_begin_dat: null, p_end_dat: null};

    if (req.query) {
        if (req.query.beginDate)  { params.p_begin_dat = req.query.beginDate};
        if (req.query.endDate)  { params.p_end_dat = req.query.endDate};
        execute.executeRes(sql_get_lab_list_size, params)
            .then(result => {
                let r = format.assocArrayFromJSON(result);
                res.json(format.getFormatRes(true, r[0], null));
            })
            .catch(err => {
                logger.error(`SQL sql_get_lab_list_size ERR= ${JSON.stringify(err)}`);
                res.json(format.getFormatRes(false, null, err));
            });
    } else {
        res.json(format.getFormatRes(false, null, 'Not params'));
    }
});

/**
 * @api {get} /labs/list Список лаб исследований (TOKEN)
 * @apiGroup labs
 * @apiVersion 0.0.1
 *
 * @apiHeader {String} Authorization Authorization: TOKEN *AUTH_TOKEN*
 *
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */

app.get("/labs/list", global.acsToken, function(req,res) {
    let user = global.getAuthUser(req);
    let params = {patient: user.patient_id, p_begin_dat: null, p_end_dat: null, p_start: null, p_end: null};

    if (req.query && req.query.beginDate && req.query.endDate && req.query.start && req.query.end) {
        params.p_begin_dat = req.query.beginDate;
        params.p_end_dat = req.query.endDate;
        params.p_start = req.query.start;
        params.p_end = req.query.end;
        console.log('!!! params=', params);
        execute.executeRes(sql_get_lab_list, params)
            .then(result => {
                let r = format.assocArrayFromJSON(result);
                res.json(format.getFormatRes(true, r, null));
            })
            .catch(err => {
                logger.error(`SQL sql_get_lab_list ERR= ${JSON.stringify(err)}`);
                res.json(format.getFormatRes(false, null, err));
            });
    } else {
        res.json(format.getFormatRes(false, null, 'Not params'));
    }
});

module.exports = app;
