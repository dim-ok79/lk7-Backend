const express = require('express');
const execute = require('../utils/execute')
const app = express();
const logger = require('../utils/logger')('route-pay-Sber');
const format = require("../utils/format");
const cfg = require('../config');
const moment = require('moment');
let ListOrderCheck = []; // {id, token, patient_id} Список заказов, которые необходимо проверить на оплату
let count_check = 5;     // Количество проверок

const SberPayService = require('../utils/sberPay');
let sber = new SberPayService(cfg.sber_pay);

const sql_sber_get_payment = "BEGIN "+cfg.db.packageName+".sber_get_payment(:p_order_id, :cursor); END;";
const sql_sber_get_paymentFromPay = "BEGIN "+cfg.db.packageName+".sber_get_paymentFromPay(:p_payment_id, :cursor); END;";

const sql_sber_create_payment = "BEGIN "+cfg.db.packageName+".sber_create_payment(:p_order_id, :p_payment_id, :p_confirmation_url, :p_patient_num, :p_email, :cursor); END;";
const sql_sber_get_list_payment_check = "BEGIN "+cfg.db.packageName+".sber_get_list_payment_check( :cursor); END;";
const sql_sber_update_payment_status = "BEGIN "+cfg.db.packageName+".sber_update_payment_status(:p_payment_id, :p_payment_num, :p_status, :p_paid,  :cursor); END;";
const sql_ffd_create = "BEGIN "+cfg.db.packageName+".ffd_create(:p_order_id, :p_payment_id, :p_ffd_id, :p_ffd_url,  :cursor); END;";
const sql_ffd_update_url = "BEGIN "+cfg.db.packageName+".ffd_update_url(:p_order_id, :p_payment_id, :p_ffd_id, :p_ffd_url, :p_ffd_err, :cursor); END;";
const sql_ffd_get_list_to_job = "BEGIN "+cfg.db.packageName+".ffd_get_list_to_job( :cursor); END;";
// const sql_get_list_check_status_created = "BEGIN "+cfg.db.packageName+".get_list_check_status_created( :cursor); END;";
const sql_ffd_get_list_create = "BEGIN "+cfg.db.packageName+".ffd_get_list_create( :cursor); END;";



moment.locale('RU');
logger.info('loading');

// /api/paysystem

function startListToCheck() {
    execute.executeRes(sql_sber_get_list_payment_check, {})
        .then(result => {
            logger.info('sql_sber_get_list_payment_check result='+ JSON.stringify(result))
            if (result){
                result.forEach(item => {
                    logger.info('sql_sber_get_list_payment_check item.PAYMENT_ID='+ item.PAYMENT_ID)
                    addOrderToCheck(item.PAYMENT_ID)
                });
            }
        })
        .catch( err => {
            logger.error('sber_get_list_payment_check =', err);
        });
}

// Смена статуса оплаты
/*
:p_payment_id,  -- ID в платежнойсистеме
:p_payment_num,
:p_status, -- статус
:p_paid,
:cursor); END;";
 */
function update_payment_status(payment_id, payment_num, status, paid) {
    return execute.executeRes(sql_sber_update_payment_status, {p_payment_id: payment_id,
        p_payment_num: payment_num,
        p_status: status,
        p_paid: paid})
        .then(result => {
            logger.info('sql_sber_update_payment_status result='+ JSON.stringify(result))
        })
        .catch( err => {
            logger.error('sql_sber_update_payment_status =', err);
        });

}

// Запись информации о фискализации
function create_ffd(payment_id, ffd_id, ffd_url) {
    return execute.executeRes(sql_ffd_create, {p_order_id: null,
        p_payment_id: payment_id,
        p_ffd_id: ffd_id,
        p_ffd_url: ffd_url})
        .then(result => {
            logger.info('sql_ffd_create result='+ JSON.stringify(result))
        })
        .catch( err => {
            logger.error('sql_ffd_create =', err);
        });
}

// Обновление URL о фискализации
async function update_ffd_url(payment_id, ffd_url, ffd_err) {
    await execute.executeRes(sql_ffd_update_url, {
        p_order_id: null,
        p_payment_id: payment_id,
        p_ffd_id: null,
        p_ffd_url: ffd_url,
        p_ffd_err: ffd_err})
        .then(result => {
            logger.info('update_ffd_url result='+ JSON.stringify(result))
        })
        .catch( err => {
            logger.error('update_ffd_url =', err);
        });
}

function jobOrderToCheckFFD() {
    let sd = new Date();
    logger.info(`JOB jobOrderToCheckFFD ${sd.getHours()}:${sd.getMinutes()} List: ${JSON.stringify(ListOrderCheck)}`);
    // КОСТЫЛЬ
//    f_ffd_get_list_create();

    execute.executeRes(sql_ffd_get_list_to_job, {})
        .then(result => {
            logger.info('sql_ffd_get_list_to_job result='+ JSON.stringify(result))
            if (result && result.length > 0 && result[0].FFD_ID) {
                logger.info('FFD item.FFD_ID=' + result[0].FFD_ID);
                sber.atolFFDStatus(result[0].FFD_ID)
                    .then(resFFD => {
                        logger.info('atolFFDStatus - ' + JSON.stringify(resFFD))
                        if (resFFD && resFFD.payload &&  resFFD.payload.ofd_receipt_url) {
                            let resultFfd = update_ffd_url(result[0].PAYMENT_ID, resFFD.payload.ofd_receipt_url, null)
                        } else {
                            let errFfd = update_ffd_url(result[0].PAYMENT_ID, null, JSON.stringify(resFFD).slice(0, 2000))
                        }
                    })
                    .catch(errFFD => {
                        logger.error('atolFFDStatus - ' + JSON.stringify(errFFD))
                        // Игнорирование не критичных ошибок
                        if (errFFD && errFFD.msg && errFFD.msg.status == 'wait') {
                            // Ничего не сохраняем
                            console.error('Atol FFD:', errFFD);
                        } else {
                            let r1 = update_ffd_url(result[0].PAYMENT_ID, null, JSON.stringify(errFFD.msg).slice(0, 2000))
                            /*
                                                    } else {
                                                        let r2 = update_ffd_url(result[0].PAYMENT_ID, null, JSON.stringify(errFFD).slice(0, 2000))
                            */
                        }

                    })
            }
        })
        .catch( err => {
            logger.error('sql_ffd_get_list_to_job =', err);
        });

};

function addOrderToCheck(paymentID) {
    logger.info('addOrderToCheck paymentID=' + JSON.stringify(paymentID));
    // Проверка на существование
    const findCheck = ListOrderCheck.filter(param => param.paymentid === paymentID);
    if (findCheck.length == 0) {
        let lt = new Date().getTime()
        ListOrderCheck.push({paymentid: paymentID, countCheck: 0, lifeTime: lt});
    }
    logger.info('ListOrderCheck=' + JSON.stringify(ListOrderCheck));
}

function jobOrderToCheck() {
//    get_list_check_status_created();
    let sd = new Date();
    logger.info(`JOB jobOrderToCheck ${sd.getHours()}:${sd.getMinutes()} List: ${JSON.stringify(ListOrderCheck)}`);
    ListOrderCheck.forEach((item, index) => {
        logger.info(`JOB Work: item.countCheck: ${item.countCheck} item.lifeTime: ${item.lifeTime}`);
        let sysdate = new Date().getTime() + 100000;
// console.log('sysdate' , sysdate);

        if (item.lifeTime <= sysdate && item.countCheck <= count_check) {
            checkPaySrv(item.paymentid)
                .then(response => {
                    logger.info('checkPaySrv response=' + JSON.stringify(response))
                    let payment_num = '';
                    if (response.authRefNum) {
                        payment_num = response.authRefNum
                    }

                    if(response && response.orderStatus) {
// Обновляем статус
                        switch(response.orderStatus) {
                            case 2:  // Оплачен
// Счет оплачен, фискалим
                                logger.info('Pay -ok- item.paymentid=' + item.paymentid);
                                // Получение данных для платежа
                                execute.executeRes(sql_sber_get_paymentFromPay, {p_payment_id: item.paymentid})
                                    .then(result => {
                                        logger.info('sql_sber_get_paymentFromPay result=' + JSON.stringify(result));
                                        /*
                                        TODO: Подмена номеров
                                                                                let tmp_ORDER_NUMBER = result[0].ORDER_NUMBER;
                                                                                if (tmp_ORDER_NUMBER == "41018-959514") {
                                                                                    tmp_ORDER_NUMBER = "41018-959514-1";
                                                                                }
                                        */
                                        // Фискализируем
                                        sber.atolFFD(
                                            result[0].ORDER_NUMBER,
                                            result[0].AMOUNT/100,
                                            result[0].JSON_PARAMS_EMAIL,
                                            result[0].CREATEDATE,
                                            result[0].SRV_INFO,
                                            result[0].PATIENT_NUM,
                                            result[0].FROM_AVANS_AMOUNT
                                        )
                                            .then(resFFD => {
                                                // Все норм, обновляем
                                                logger.info('atolFFD resFFD=' + JSON.stringify(resFFD))

                                                // Записать фискальник
                                                create_ffd(item.paymentid, resFFD.uuid, null)
                                                    .then(res_create_ffd => {
                                                        logger.info('create_ffd=' + JSON.stringify(res_create_ffd))
                                                    })
                                                    .catch(err_create_ffd => {
                                                        logger.error('create_ffd=' + JSON.stringify(err_create_ffd))
                                                    });

                                                update_payment_status(item.paymentid, payment_num, 'paid', 1)
                                                    .then(result => {
                                                        ListOrderCheck.splice(index, 1); // Удаляем
                                                    })
                                                    .catch(err => {
                                                        logger.error('update_payment_status=' + JSON.stringify(err))
                                                    });
                                            })
                                            .catch(errFFD => {
                                                logger.error('Atol FFD Error=' + JSON.stringify(errFFD))
                                            })
                                    })
                                    .catch(err => {
                                        logger.error('sql_sber_get_payment error=' + JSON.stringify(err));
                                    })
                                break;
                            case 6:   // 'Истек срок ожидания ввода данных',
                                update_payment_status(item.paymentid, payment_num, 'expired', 0)
                                    .then(result => {
                                        ListOrderCheck.splice(index, 1); // Удаляем
                                    })
                                    .catch(err => {
                                        logger.error('update_payment_status=' + JSON.stringify(err))
                                    });
                                break
                        }

                    }

                    /*
                      orderStatus: 6,
                      actionCode: -2007,
                      actionCodeDescription: 'Истек срок ожидания ввода данных',
                     */
                })
                .catch(err => {
                    logger.error('ERR AUTH=' + JSON.stringify(err));
//                        res.json(format.getFormatRes(false, null, 'Error AUTH web-pay'));
                    // Произошло что-то плохое, обработка ошибки
                });
            item.countCheck++;
        } else {
            ListOrderCheck.splice(index, 1); // Удаляем
        }
    })
}

// Проверка статуса ORDER на сервере
function checkPaySrv(orderID) {
    return sber.getPayInfo(orderID)
}

/* не используется */
/*
function get_list_check_status_created() {
    let sd = new Date();
    logger.info(`get_list_check_status_created ${sd.getHours()}:${sd.getMinutes()} List: ${JSON.stringify(ListOrderCheck)}`);

    execute.executeRes(sql_get_list_check_status_created, {})
        .then(result => {
            logger.info('sql_get_list_check_status_created result='+ JSON.stringify(result))
            if (result && result.length > 0 && result[0].PAYMENT_ID) {
                // Добавляем в список для проверки статуса
                result.forEach(item => addOrderToCheck(item.PAYMENT_ID));
            }
        })
        .catch( err => {
            logger.error('sql_get_list_check_status_created =', err);
        });

};
*/

/**
 * @api {get} /pay/paysystem Тип платежной системы (TOKEN)
 * @apiGroup pay
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

app.get("/pay/paysystem", global.acsToken, function (req, res) {
// ответ сервера /paysystem
    sber.getPaySystem()
        .then(resPaySystem => {
            res.json(resPaySystem);
        })
        .catch(errPaySystem => {
            logger.error('getPaySystem=', errPaySystem)
            res.json(format.getFormatRes(false, null, errPaySystem));
        })
});

/**
 * @api {post} /pay/select Выбор типа оплаты заказа
 * @apiGroup pay
 * @apiVersion 0.0.1
 *
 * @apiBody {String} orderId  Заказ (ID)
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */

app.get("/pay/select", function (req, res) {
    /*
        let user = global.getAuthUser(req);
    console.log('user.patient_id=', user.patient_id);
    */
    console.log('**** SELECT PAY req.query=', req.query);

    if (req.query && req.query.orderid) {
        // Вывод страници
        if (cfg.pay && cfg.pay.file_select_pay_html) {
            res.sendfile(`static/html/${cfg.pay.file_select_pay_html}`);
        } else {
            res.sendfile(`static/html/select-pay.html`);
        }
    } else {
        res.json(format.getFormatRes(false, null, 'Not params'));
    }
});

// Всегда возвращяет ссылку с номером заказа
app.post("/pay/order", global.acsToken, function (req, res) {
    let user = global.getAuthUser(req);
    if (req.body && req.body.orderid) {
        res.json(format.getFormatRes(true, {confirmationurl: `${cfg.sber_pay.url_select_pay}?orderid=${req.body.orderid}`}, null));
    } else {

        res.json(format.getFormatRes(false, null, 'Not params'));
    }
});

/**
 * @api {get} /pay/order Оплата заказа
 * @apiGroup pay
 * @apiVersion 0.0.1
 *
 * @apiBody {String} orderId  Заказ (ID)
 * @apiBody {String} pay  Тип оплаты
 * @apiBody {String} email  Почта для оплаты
 *
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */

// Получение платежа по типу
app.get("/pay/order", function (req, res) {
    logger.info('req.query=' + JSON.stringify(req.query));
    if (req.query && req.query.orderid && req.query.pay) {
        let p_url = '';
        let p_JSON_PARAMS_EMAIL = null;
        if (req.query.email) {
            p_JSON_PARAMS_EMAIL = req.query.email;
        }

        switch(req.query.pay) {
            case 'sbp':
                p_url = '/createPaySBP';
                break;
            case 'card':
                p_url = '/createPay';
                break;
        }
        // Получение данных для платежа
        execute.executeRes(sql_sber_get_payment, {p_order_id: req.query.orderid})
            .then(result => {
                logger.info('sql_sber_get_payment result=' + JSON.stringify(result));
                if (result[0].JSON_PARAMS_EMAIL && result[0].JSON_PARAMS_EMAIL.length > 3) {
                    p_JSON_PARAMS_EMAIL = result[0].JSON_PARAMS_EMAIL;
                }
                sber.createPayServ(
                    p_url,
                    result[0].ORDER_NUMBER,
                    result[0].AMOUNT,
                    result[0].RETURN_URL,
                    p_JSON_PARAMS_EMAIL, //result[0].JSON_PARAMS_EMAIL,
                    result[0].EXPIRATION_DATE,
                    result[0].SRV_INFO,
                    result[0].PATIENT_NUM)
                    .then(res_create_pay => {
                        console.log('res_create_pay=' , res_create_pay);
                        logger.info('res_create_pay=' + JSON.stringify(res_create_pay));
                        // Если пришел урл то выполнить sql_sber_create_payment
                        if (res_create_pay.confirmationurl && res_create_pay.paimentid){
                            execute.executeRes(sql_sber_create_payment, {p_order_id: req.query.orderid
                                ,p_payment_id: res_create_pay.paimentid
                                ,p_confirmation_url: res_create_pay.confirmationurl
                                ,p_patient_num: result[0].PATIENT_NUM
                                ,p_email: p_JSON_PARAMS_EMAIL})
                                .then(res_create_payment => {
                                    logger.info('sql_sber_create_payment res=' + JSON.stringify(res_create_payment));
                                    addOrderToCheck(res_create_pay.paimentid);
                                    res.json(format.getFormatRes(true, res_create_pay, null));
                                })
                                .catch(err_create_payment => {
                                    res.json(format.getFormatRes(false, null, err_create_payment));
                                });
                        } else {
                            res.json(format.getFormatRes(true, res_create_pay, null));
                        }
                    })
                    .catch(err_create_pay => {
                        logger.error('err_create_pay=' + err_create_pay)
                        res.json(format.getFormatRes(false, null, err_create_pay));
                    })
            })
            .catch(err => {
                res.json(format.getFormatRes(false, null, err));
            });
    } else {
        res.json(format.getFormatRes(false, null, 'Not params'));
    }
});

/**
 * @api {post} /pay/order/check Проверка состояния платежа (TOKEN)
 * @apiGroup pay
 * @apiVersion 0.0.1
 *
 * @apiHeader {String} Authorization Authorization: TOKEN AUTH_TOKEN *
 *
 * @apiParam {String} orderId  Заказ (ID)
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */

app.post("/pay/order/check", function (req, res) {
    checkPaySrv(req.body.orderId)
        .then(function (response) {
            logger.info(`checkPaySrv RES: ${JSON.stringify(response.data)}`);
            if (response.data) {
                try {
                    const dt = JSON.parse(response.data);
                    res.json(format.getFormatRes(true, dt, null));
                } catch (e) {
                    res.json(format.getFormatRes(true, response.data, null));
                }
            } else {
                res.json(format.getFormatRes(false, null, 'Error AUTH web-pay data'));
            }
            // Запрос был успешным, используйте объект ответа как хотите
        })
        .catch(function (err) {
            logger.error(`checkPaySrv ERROR: ${JSON.stringify(err)}`);
            res.json(format.getFormatRes(false, null, 'Error AUTH web-pay'));
            // Произошло что-то плохое, обработка ошибки
        });
});

/* Получить список фискальных чеков с URL но статус CREATE КОСТЫЛЬ*/
function f_ffd_get_list_create() {
    execute.executeRes(sql_ffd_get_list_create, {})
        .then(result => {
            logger.info('sql_ffd_get_list_create result=' + JSON.stringify(result));
            if (result && result.length>0 && result[0].FFD_ERR){
                let FFD_ERR = JSON.parse(result[0].FFD_ERR);
                logger.info('FFD_ERR=' + JSON.stringify(FFD_ERR));
                logger.info('FFD_ERR.status =' + JSON.stringify(FFD_ERR.status ));
                logger.info('result[0].PAYMENT_ID=' + JSON.stringify(result[0].PAYMENT_ID));
                logger.info('result[0].PAYMENT_NUM=' + JSON.stringify(result[0].PAYMENT_NUM));
                if (FFD_ERR && FFD_ERR.status && result[0].PAYMENT_ID && FFD_ERR.status === 'done'){
                    // Обновляем статус
                    update_payment_status(result[0].PAYMENT_ID, result[0].PAYMENT_NUM, 'paid', 1)
                        .then(result => {
                            logger.info('FFD UPDATE STATUS PAID=' + JSON.stringify(result));
                        })
                        .catch(err => {
                            logger.error('update_payment_status=' + JSON.stringify(err))
                        });
                }
            }
            else {
                logger.info('sql_ffd_get_list_create - Список пуст ОК');
            }
        })
        .catch(err => {
            logger.error('sql_ffd_get_list_create ERr=' + JSON.stringify(err));
        })
}

/* JOB для проверки платежей на сервере */

if (cfg.pay.job_order_to_check_time_out) {
    logger.info('Start JOB check pay time=' + cfg.pay.job_order_to_check_time_out);
    setInterval(jobOrderToCheck, cfg.pay.job_order_to_check_time_out * 1000 * 60);
    // количество проверок
    if (cfg.pay.job_order_to_check_count_check) {
        count_check = cfg.pay.job_order_to_check_count_check;
    }
}

if (cfg.pay.job_order_to_ffd_time_out) {
    logger.info('Start JOB check pay FFD time=' + cfg.pay.job_order_to_ffd_time_out);
    setInterval(jobOrderToCheckFFD, cfg.pay.job_order_to_ffd_time_out * 1000 * 60);
}

// Запуск 1 раз при старте 10 секунд
// setTimeout(startListToCheck, 0.10 * 1000 * 60);
setTimeout(startListToCheck, 1 * 1000 * 60);

module.exports = app;

