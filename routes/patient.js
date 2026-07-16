const express = require('express');
const execute =  require('../utils/execute')
const app = express();
const logger = require('../utils/logger')('route-patient');
const jwt = require('jsonwebtoken');
const format = require("../utils/format");
const cfg = require('../config');

const sql_get_info = "BEGIN "+cfg.db.packageName+".patient_info(:patient, :cursor); END;";
const sql_create_login_to_email = "BEGIN "+cfg.db.packageName+".create_login_to_email(:patient, :cursor); END;";
const sql_get_city_patient = "BEGIN "+cfg.db.packageName+".get_city_patient(:patient, :cursor); END;";
const sql_get_family = "BEGIN "+cfg.db.packageName+".get_family(:patient, :cursor); END;";
const sql_get_police = "BEGIN "+cfg.db.packageName+".get_police(:patient, :cursor); END;";

/**
 * @api {get} /patient/info Данные о пациенте (TOKEN)
 * @apiGroup patient
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
app.get("/patient/info",global.acsToken, function(req,res) {
    let user = global.getAuthUser(req);
    execute.executeRes(sql_get_info, {patient: user.patient_id})
        .then(result => {
            const tmp = format.assocArrayFromJSON(result);
            res.json(format.getFormatRes(true, tmp[0], null));
        })
        .catch(err => {
            res.json(format.getFormatRes(false, null, err));
        });
});

/**
 * @api {get} /patient/create_pw Генерация пароля и логина (TOKEN)
 * @apiGroup patient
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
app.get("/patient/create_pw",global.acsToken, function(req,res) {
    let user = global.getAuthUser(req);
    execute.executeRes(sql_create_login_to_email, {patient: user.patient_id})
        .then(result => {
            const tmp = format.assocArrayFromJSON(result);
            res.json(format.getFormatRes(true, tmp[0], null));
        })
        .catch(err => {
            res.json(format.getFormatRes(false, null, err));
        });
});

/**
 * @api {get} /patient/city Список городом пациента (СПБ, Валдай) пациенте (TOKEN)
 * @apiGroup patient
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
app.get("/patient/city",global.acsToken, function(req,res) {
    let user = global.getAuthUser(req);
    execute.executeRes(sql_get_city_patient, {patient: user.patient_id})
        .then(result => {
            const tmp = format.assocArrayFromJSON(result);
            res.json(format.getFormatRes(true, tmp, null));
        })
        .catch(err => {
            res.json(format.getFormatRes(false, null, err));
        });
});

/**
 * @api {get} /patient/family Данные о родстве (TOKEN)
 * @apiGroup patient
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
app.get("/patient/family",global.acsToken, function(req,res) {
    let user = global.getAuthUser(req);
    execute.executeRes(sql_get_family, {patient: user.patient_id})
        .then(result => {
            const tmp = format.assocArrayFromJSON(result);
            res.json(format.getFormatRes(true, tmp, null));
        })
        .catch(err => {
            res.json(format.getFormatRes(false, null, err));
        });
});

/**
 * @api {get} /patient/police Информация о полисе (TOKEN)
 * @apiGroup patient
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
app.get("/patient/police",global.acsToken, function(req,res) {
    let user = global.getAuthUser(req);
    execute.executeRes(sql_get_police, {patient: user.patient_id})
        .then(result => {
            const tmp = format.assocArrayFromJSON(result);
            res.json(format.getFormatRes(true, tmp[0], null));
        })
        .catch(err => {
            res.json(format.getFormatRes(false, null, err));
        });
});



module.exports = app;

