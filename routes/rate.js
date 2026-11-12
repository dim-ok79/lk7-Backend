const express = require('express');
const execute =  require('../utils/execute')
const app = express();
const logger = require('../utils/logger')('route-rate');
const format = require("../utils/format");
const cfg = require('../config');

const sql_add_rate = "BEGIN "+cfg.db.packageName+".add_rate(:patient, :visit_keyid, :doctorid, :specid, :typehistory, :rate_count, :rate_text, :cursor); END;";

/**
 * @api {get} /rate/add Добавление оценки врача (TOKEN)
 * @apiGroup rate
 * @apiVersion 0.0.1
 *
 * @apiHeader {String} Authorization Authorization: TOKEN AUTH_TOKEN *
 *
 * @apiParam {Number} visit_keyid - Визит
 * @apiParam {Number} doctorid - Визит
 * @apiParam {Number} specid - Специальность
 * @apiParam {Number} rate_count - количество звезд
 * @apiParam {String} rate_text  - Информация
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */
app.post("/rate/add", global.acsToken, function(req,res) {
    let user = global.getAuthUser(req);
    let params = {patient: user.patient_id, visit_keyid: null, doctorid: null, specid: null, typehistory: null ,rate_count: null, rate_text: null};
    logger.info('req.body=' + JSON.stringify(req.body));
// У диагностики нет специальности
//    if (req.body && req.body.visit_keyid && req.body.doctorid && req.body.specid && req.body.rate_count && req.body.typehistory) {
    if (req.body && req.body.visit_keyid && req.body.doctorid && req.body.rate_count && req.body.typehistory) {
        params.visit_keyid = req.body.visit_keyid;
        params.doctorid = req.body.doctorid;
        params.specid = req.body.specid;
        params.typehistory = req.body.typehistory;
        params.rate_count = req.body.rate_count;

        if (req.body.rate_text)  { params.rate_text = req.body.rate_text};

        execute.executeRes(sql_add_rate, params)
            .then(result => {
                if (result && result.length>0 && result[0].ERR_CODE == 0){
                    res.json(format.getFormatRes(true, format.assocArrayFromJSON(result), null));
                } else {
                    res.json(format.getFormatRes(false, format.assocArrayFromJSON(result), 'Оценка уже была'));
                }
            })
            .catch(err => {
                res.json(format.getFormatRes(false, null, err));
            });

    } else {
        res.json(format.getFormatRes(false, null, 'Not params'));
    }
});


module.exports = app;

