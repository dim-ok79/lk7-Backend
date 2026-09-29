const express = require('express');
const execute =  require('../utils/execute')
const app = express();
const logger = require('../utils/logger')('route-seaman');
const format = require("../utils/format");
var cfg = require('../config');

const sql_get_patient_is_seaman = "BEGIN "+cfg.db.packageName+".get_patient_is_seaman(:p_patient_id, :cursor); END;";


/**
 * @api {get} /seamen/patient Пациент является моряком (TOKEN)
 * @apiGroup seamen
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
app.get("/seamen/patient", global.acsToken, (req,res) => {
    let user = global.getAuthUser(req);
    let params = {p_patient_id: user.patient_id};

        execute.executeRes(sql_get_patient_is_seaman, params)
            .then(result => {
                let r = format.assocArrayFromJSON(result);
                res.json(format.getFormatRes(true, r[0], null));
            })
            .catch(err => {
                res.json(format.getFormatRes(false, null, err));
            });
});



module.exports = app;
