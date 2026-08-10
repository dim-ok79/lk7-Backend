const express = require('express');
const execute =  require('../utils/execute')
const app = express();
const logger = require('../utils/logger')('route-payments');
const format = require("../utils/format");
const cfg = require('../config');

const sql_payments_by_patient = "BEGIN "+cfg.db.packageName+".payments_by_patient(:patient, :dat_from, :dat_to, :start, :end, :cursor); END;";
const sql_payments_by_patient_size = "BEGIN "+cfg.db.packageName+".payments_by_patient_size(:patient, :dat_from, :dat_to, :cursor); END;";

const sql_payment_temp = "BEGIN "+cfg.db.packageName+".payment_temp(:patient, :payment_lu_tag, :amount, :email, :phone, :police,  :cursor); END;";
const sql_get_balans_by_patient = "BEGIN "+cfg.db.packageName+".get_balans_by_patient(:patient,  :cursor); END;";
const sql_get_payment_url = "BEGIN "+cfg.db.packageName+".get_payment_url(:p_order_id,  :cursor); END;";
const sql_get_email_from_order = "BEGIN "+cfg.db.packageName+".get_email_from_order(:p_order_id,  :cursor); END;";

/**
 * @api {get} /payments/patient Cписок платежей по пациенту (TOKEN)
 * @apiGroup payments
 * @apiVersion 0.0.1
 *
 * @apiHeader {String} Authorization Authorization: TOKEN AUTH_TOKEN *
 *
 * @apiParam {String} beginDate  Дата с
 * @apiParam {String} endDate  Дата по
 * @apiParam {Number} [start]  Пагинация, с какой записи
 * @apiParam {Number} [end]  Пагинация, по какую запись
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */
app.get("/payments/patient", global.acsToken, function(req,res) {
    let user = global.getAuthUser(req);
    let params = {patient: user.patient_id, dat_from: null, dat_to: null, start: null, end: null};

    if (req.query) {
        if (req.query.beginDate)  { params.dat_from = req.query.beginDate};
        if (req.query.endDate)  { params.dat_to = req.query.endDate};
        if (req.query.start)  { params.start = req.query.start};
        if (req.query.end)  { params.end = req.query.end};

        execute.executeRes(sql_payments_by_patient, params)
            .then(result => {
                let r = format.assocArrayFromJSON(result);
// console.log('R=', r);
                var index;
                for (index = 0; index < r.length; ++index) {
                    if (r[index].srv_qty || r[index].srv_qty > 0 || r[index].srv_info) {
                        let srv = [];
                        let srv_text = r[index].srv_info;
                        let srv_r = srv_text.split('#!#');
                        srv_r.forEach(item => {
                            let item_r = item.split('@!@');
// console.log('item_r=', item_r);
                            if (item_r.length == 6) {
                                srv.push({name: item_r[0], doc_id: item_r[1], doc: item_r[2], spec_name: item_r[3] ,dtSTR: item_r[4], price: item_r[5]})
                            } else { // по старому
                                srv.push({name: item_r[0], doc: item_r[1], dtSTR: item_r[2], price: item_r[3]})
                            }
                        });
                        r[index] = Object.assign(r[index], {services: srv}); // Добавление
//                        r[index].services = 'sdfsdfsdf';
                    }
//                    console.log('services=', r[index].services);
                }

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

/**
 * @api {get} /payments/patient/size Количество платежей по пациенту (TOKEN)
 * @apiGroup payments
 * @apiVersion 0.0.1
 *
 * @apiHeader {String} Authorization Authorization: TOKEN AUTH_TOKEN *
 *
 * @apiParam {String} dat_from  Дата с
 * @apiParam {String} dat_to  Дата по
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */
app.get("/payments/patient/size", global.acsToken, function(req,res) {
    let user = global.getAuthUser(req);
    let params = {patient: user.patient_id, dat_from: null, dat_to: null};

    if (req.query) {
        if (req.query.beginDate)  { params.dat_from = req.query.beginDate};
        if (req.query.endDate)  { params.dat_to = req.query.endDate};

        execute.executeRes(sql_payments_by_patient_size, params)
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
 * @api {get} /payments/patient/temp Создание оплаты (TOKEN)
 * @apiGroup payments
 * @apiVersion 0.0.1
 *
 * @apiHeader {String} Authorization Authorization: TOKEN AUTH_TOKEN *
 *
 * @apiParam {Number} typePay  Тип платежа (22 - аванс)
 * @apiParam {Number} amount  Сумма
 * @apiParam {String} email  Почта
 * @apiParam {String} phone  Телефон
 * @apiParam {String} police Полис = ''
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */
app.get("/payments/patient/temp", global.acsToken, function(req,res) {
    let user = global.getAuthUser(req);
    let params = {patient: user.patient_id, payment_lu_tag: null, amount: null, email: null, phone: null, police: null};
    if (req.query && req.query.typePay && req.query.amount && (req.query.email || req.query.phone) ) {
        params.payment_lu_tag = req.query.typePay;
        params.amount = req.query.amount;
        if (req.query.email)  { params.email = req.query.email};
        if (req.query.phone)  { params.email = req.query.phone};
        if (req.query.police)  { params.email = req.query.police};

        execute.executeRes(sql_payment_temp, params)
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
 * @api {get} /payments/patient/balanse Баланс по пациенту по пациенту (TOKEN)
 * @apiGroup payments
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
app.get("/payments/patient/balanse", global.acsToken, function(req,res) {
    let user = global.getAuthUser(req);
    let params = {patient: user.patient_id};
    execute.executeRes(sql_get_balans_by_patient, params)
        .then(result => {
            let r = format.assocArrayFromJSON(result);
            res.json(format.getFormatRes(true, r[0], null));
        })
        .catch(err => {
            res.json(format.getFormatRes(false, null, err));
        });
});

/**
 * @api {get} /payments/patient/balanse Баланс по пациенту по пациенту (TOKEN)
 * @apiGroup payments
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

app.get("/payments/patient/payment_url", function(req,res) {
    let user = global.getAuthUser(req);
    if (req.query && req.query.order_id) {
        let params = {p_order_id: req.query.order_id};
        execute.executeRes(sql_get_payment_url, params)
            .then(result => {
                let r = format.assocArrayFromJSON(result);
                console.log('sql_get_payment_url res=', r);
                if (r && r.length >0){ // Есть URL платежа
                    res.json(format.getFormatRes(true, r[0], null));
                } else {
//
                    execute.executeRes(sql_get_email_from_order, params)
                        .then(resEmail => {
                            res.json(format.getFormatRes(true, resEmail[0], null));
                        })
                        .catch(errEmail => {
                            res.json(format.getFormatRes(false, null, errEmail));
                        });
//
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

