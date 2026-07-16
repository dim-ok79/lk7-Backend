const express = require('express');
const execute =  require('../utils/execute')
const app = express();
const format = require("../utils/format");
const cfg = require('../config');


const sql_get_lpu_list = "BEGIN "+cfg.db.packageName+".get_lpu_list(:patient, :cursor); END;";




/**
 * @api {get} /lpu/list Список подразделений (TOKEN)
 * @apiGroup lpu
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

app.get("/lpu/list", global.acsToken, function(req,res) {
    let user = global.getAuthUser(req);
        execute.executeRes(sql_get_lpu_list, {patient: user.patient_id})
            .then(result => {
                let r = format.assocArrayFromJSON(result);
                res.json(format.getFormatRes(true, r, null));
            })
            .catch(err => {
                res.json(format.getFormatRes(false, null, err));
            });
});

module.exports = app;

