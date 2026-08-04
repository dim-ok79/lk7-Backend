const express = require('express');
const execute =  require('../utils/execute')
const app = express();
// const logger = require('../utils/logger')('route-rnumb');
const format = require("../utils/format");
const cfg = require('../config');

const sql_rnumbs_patient = "BEGIN "+cfg.db.packageName+".get_rnumbs_by_patient(:patient, :cursor); END;";

/**
 * @api {get} /rnumb/list Предстоящие записи пациента (TOKEN)
 * @apiGroup rnumb
 * @apiVersion 0.0.1
 *
 * @apiHeader {String} Authorization Authorization: TOKEN AUTH_TOKEN *
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */
app.get("/rnumb/list", global.acsToken, function(req,res) {
    let user = global.getAuthUser(req);
    execute.executeRes(sql_rnumbs_patient, {patient: user.patient_id})
        .then(result => {
            const tmp = format.assocArrayFromJSON(result);
            res.json(format.getFormatRes(true, tmp, null));
        })
        .catch(err => {
            res.json(format.getFormatRes(false, null, err));
        });
});

module.exports = app;

