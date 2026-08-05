const express = require('express');
const execute =  require('../utils/execute')
const app = express();
const logger = require('../utils/logger')('route-history');
const format = require("../utils/format");
const sb = require('../utils/streamBuffer');
var cfg = require('../config');
const getErrorHtml = require("../utils/template").getErrorHtml;
const getVisitHtml = require("../utils/template").getVisitHtml;
const jwt = require('jsonwebtoken');


var htmlToPdf = require('html-pdf');

const sql_history_events_size = "BEGIN "+cfg.db.packageName+".get_history_events_size(:patient, :p_begin_dat, :p_end_dat, :cursor); END;";
const sql_history_events = "BEGIN "+cfg.db.packageName+".get_history_events(:patient, :p_begin_dat, :p_end_dat, :start, :end, :cursor); END;";

const sql_lab_orders_size = "BEGIN "+cfg.db.packageName+".lab_orders_size(:patient, :dat_from, :dat_to, :cursor); END;";
const sql_lab_orders = "BEGIN "+cfg.db.packageName+".lab_orders(:patient, :dat_from, :dat_to, :start, :end, :orderbyasc, :cursor); END;";
const sql_lab_result = "BEGIN "+cfg.db.packageName+".get_lab_result(:research_id, :cursor); END;";

const sql_history_diagnostic = "BEGIN "+cfg.db.packageName+".history_diagnostic(:research_id, :cursor); END;";
const sql_history_visit = "BEGIN "+cfg.db.packageName+".history_visit(:visit_id, :cursor); END;";

const sql_get_visit_talon = "BEGIN "+cfg.db.packageName+".get_visit_talon(:patient_id, :visit_id, :cursor); END;";
const sql_get_files_for_rec = "BEGIN "+cfg.db.packageName+".get_files_for_rec(:p_rec_id, :cursor); END;";

const sql_files_get_blob = "BEGIN "+cfg.db.packageName+".files_get_blob(:p_id, :cursor); END;";

function exeBd(sql, params) {
    return new Promise((resolve, reject) => {
        execute.executeRes(sql, params)
            .then(result => {
                resolve(format.assocArrayFromJSON(result));
            })
            .catch(err => {
                reject(err);
            });
    });
}

/*  Информация о диагностике в html*/
function get_history_diagnostic(p_research_id) {
    let params = {research_id: p_research_id};
    return  exeBd(sql_history_diagnostic, params)
}

/*  Информация о Визите в html*/
function get_history_visit(p_visit_id) {
    let params = {visit_id: p_visit_id};
    return  exeBd(sql_history_visit, params)
}

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
//    sql_history_events_size = "BEGIN "+cfg.db.packageName+".history_events_size(:patient, :p_begin_dat, :p_end_dat, :cursor); END;";
    /*
        if (req.query.beginDate && req.query.endDate) {
    */
    if (req.query) {
// console.log('req.query=', req.query);
        if (req.query.beginDate) { params.p_begin_dat = req.query.beginDate; }
        if (req.query.endDate)   { params.p_end_dat = req.query.endDate;     }

// console.log('params=', params);
        execute.executeRes(sql_history_events_size, params)
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

//        const sql_history_events = "BEGIN "+cfg.db.packageName+".history_events(:patient, :p_begin_dat, :p_end_dat, :start, :end, :cursor); END;";

        execute.executeRes(sql_history_events, params)
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

/**
 * @api {get} /history/events/item 3) Описание посещения пациента (TOKEN)
 * @apiGroup history
 * @apiVersion 0.0.1
 *
 * @apiHeader {String} Authorization Authorization: TOKEN *AUTH_TOKEN*
 *
 * @apiParam {String} typeRes  Тип результата (visit, diag)
 * @apiParam {String} id  Идентификатор
 *
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */

app.get("/history/events/item", global.acsToken, function(req,res) {
    let user = global.getAuthUser(req);
    /*
        let l_visit_id = 2149651101;
        let l_patient = 384551420;
        let l_type = 'visit';
    */

    if (req.query && req.query.id && req.query.typeRes) {
        let l_id = req.query.id;
        let l_patient = user.patient_id;
        let l_type = req.query.typeRes;

        switch (l_type.toUpperCase()) {
            case 'VISIT':
                get_history_visit(l_id)
                    .then(resQ => {
                        res.json(format.getFormatRes(true, resQ, null));
                    })
                    .catch(errQ => {
                        res.json(format.getFormatRes(false, null, errQ));
                    });
                break;
            case 'DIAG':
                get_history_diagnostic(l_id)
                    .then(resQ => {
                        res.json(format.getFormatRes(true, resQ, null));
                    })
                    .catch(errQ => {
                        res.json(format.getFormatRes(false, null, errQ));
                    });
                break;
            default:
                res.json(format.getFormatRes(false, null, 'Ignore type'));
        }
    } else {
        res.json(format.getFormatRes(false, null, 'Not params'));
    };

});

/**
 * @api {get} /history/events/item/:tp/:id.pdf 4) Описание посещения пациента PDF
 * @apiGroup history
 * @apiVersion 0.0.1
 *
 *
 * @apiParam {String} tp  Тип результата (visit, diag)
 * @apiParam {String} id  Идентификатор
 *
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */

app.get("/history/events/item/:tp/:id.pdf", function(req,res) {
//    console.log('+++++++TP=', req.params['tp']); // тип
//    console.log('+++++++Id=', req.params['id']); // id
    if (req.params && req.params['tp'] && req.params['id']){
        let l_id = req.params['id'];
        let l_type = req.params['tp'];
        var options = { format: 'Letter' };

        switch (l_type.toUpperCase()) {
            case 'VISIT':
                get_history_visit(l_id)
                    .then(resQ => {
                        if (resQ && resQ.length>0) {
                            let txt = '';
                            resQ.forEach(item => {
                                txt =  txt + item.text;
                            });
                            var html = '<!DOCTYPE html>\n' +
                                '<html lang="en">\n' +
                                '<head>\n' +
                                '    <meta charset="UTF-8">\n' +
                                '    <title>Консультация</title>\n' +
                                '</head>\n' +
                                '<body>\n' +
                                txt +
                                '</body>\n' +
                                '</html>\n';

                            htmlToPdf.create(html).toStream(function(err, stream){
                                if (err) {
                                    console.log('PDF ERROR =', err);
                                    logger.error('htmlToPdf ERR=' + JSON.stringify(err));
                                    getErrorHtml('Ошибка формирования заключения', 'Пожалуйста, обратитесь в регистратуру', res);
                                } else {
                                    res.contentType('application/pdf');
                                    stream.pipe(res);
                                }
                            });

                        } else {
                            getErrorHtml('Ошибка формирования заключения', 'Пожалуйста, обратитесь в регистратуру', res);
                        }
                    })
                    .catch(errQ => {
                        getErrorHtml('Ошибка формирования заключения', 'Пожалуйста, обратитесь в регистратуру', res);
//                        res.json(format.getFormatRes(false, null, errQ));
                    });
                break;
            case 'DIAG':
                get_history_diagnostic(l_id)
                    .then(resQ => {
                        if (resQ && resQ.length>0) {
                            let txt = '';
                            resQ.forEach(item => {
                                txt =  txt + item.text;
                            });
                            var html = '<!DOCTYPE html>\n' +
                                '<html lang="en">\n' +
                                '<head>\n' +
                                '    <meta charset="UTF-8">\n' +
                                '    <title>Диагностика</title>\n' +
                                '</head>\n' +
                                '<body>\n' +
                                txt +
                                '</body>\n' +
                                '</html>\n';

                            htmlToPdf.create(html).toStream(function(err, stream){
                                if (err) {
                                    getErrorHtml('Ошибка формирования заключения', 'Пожалуйста, обратитесь в регистратуру', res);
//                                    res.json(format.getFormatRes(false, null, 'Err gener PDF'));
                                } else {
                                    res.contentType('application/pdf');
                                    stream.pipe(res);
                                }
                            });
                        } else {
                            getErrorHtml('Ошибка формирования заключения', 'Пожалуйста, обратитесь в регистратуру', res);
                        }
                    })
                    .catch(errQ => {
                        getErrorHtml('Ошибка формирования заключения', 'Пожалуйста, обратитесь в регистратуру', res);
//                        res.json(format.getFormatRes(false, null, errQ));
                    });
                break;
            default:
                getErrorHtml('Ошибка формирования заключения', 'Пожалуйста, обратитесь в регистратуру', res);
//                res.json(format.getFormatRes(false, null, 'Ignore type'));
        }


    } else {
        getErrorHtml('Ошибка формирования заключения', 'Пожалуйста, обратитесь в регистратуру', res);
//        res.json(format.getFormatRes(false, null, 'Not params'));
    }
});

// sql_get_visit_talon
/**
 * @api {get} /history/visit/pdf/:visitid.pdf  печать визита (TOKEN)
 * @apiGroup history
 * @apiVersion 0.0.1
 *
 * @apiHeader {String} Authorization Authorization: TOKEN *AUTH_TOKEN*
 *
 * @apiParam {String} visitid id визита
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */
// app.get("/history/visit/pdf/:visit.pdf", global.acsToken, function(req,res) {
app.get("/history/visit/pdf/:token/:visit.pdf", function(req,res) {
    if (req.params && req.params['visit'] && req.params['token']) {
        let user = jwt.decode(req.params['token']);
        if (user && user.patient_id){
            let params = {patient_id: user.patient_id, visit_id: null};

            params.visit_id = req.params['visit'];

            execute.executeRes(sql_get_visit_talon, params)
                .then(result => {
//                    console.log('result=', result);
                    let r = format.assocArrayFromJSON(result);
                    console.log('r=', r);
                    if (r && r[0]) {
                        let html = getVisitHtml(r[0].num, r[0].fio, r[0].time, r[0].barcode);
                        htmlToPdf.create(html).toStream(function(err, stream){
                            if (err) {
                                getErrorHtml('Ошибка формирования печати-3', 'Пожалуйста, обратитесь в регистратуру', res);
                            } else {
                                res.contentType('application/pdf');
                                stream.pipe(res);
                            }
                        });

                    } else {
                        logger.error(`Ошибка загрузки данных по визиту ${req.query.visit}`);
                        getErrorHtml('Ошибка формирования печати-2', 'Пожалуйста, обратитесь в регистратуру', res);
                    }
                })
                .catch(err => {
                    getErrorHtml('Ошибка формирования печати-1', 'Пожалуйста, обратитесь в регистратуру', res);
                });

        } else {
            getErrorHtml('Ошибка формирования печати (авторизация)', 'Пожалуйста, обратитесь в регистратуру', res);
        };

    } else {
        getErrorHtml('Ошибка формирования печати (параметры)', 'Пожалуйста, обратитесь в регистратуру', res);
    }
});

/**
 * @api {get} /history/event/files Список подписанных документов на посещение (TOKEN)
 * @apiGroup history
 * @apiVersion 0.0.1
 *
 * @apiHeader {String} Authorization Authorization: TOKEN *AUTH_TOKEN*
 *
 * @apiParam {Number} id  visitID
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */
app.get("/history/event/files/:visitid", global.acsToken, function(req,res) {
    let user = global.getAuthUser(req);
    let params = {p_rec_id: null};

    if (req.params['visitid']) {
        params.p_rec_id = req.params['visitid'];
        execute.executeRes(sql_get_files_for_rec, params)
            .then(result => {
                let r = format.assocArrayFromJSON(result);
                res.json(format.getFormatRes(true, r, null));
            })
            .catch(err => {
                res.json(format.getFormatRes(false, null, err));
            });

    } else {
        res.json(format.getFormatRes(false, null, 'Not params'));
    }
});

/**
 * @api {get} /history/events/files/:typerec/:files.pdf Получить подписанный документ PDF
 * @apiGroup history
 * @apiVersion 0.0.1
 *
 * @apiParam {Number} patientId id Пациента
 * @apiParam {Number} contractId id Документа
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */

app.get("/history/events/files/:typerec/:files.pdf", function(req,res) {
    if (req.params && req.params['typerec'] && req.params['files']) {
        let params = {p_id: req.params['files']};
        execute.executeRes(sql_files_get_blob, params)
            .then(result => {
                if (result && result[0] && result[0].BYTES){
                    let blob = result[0].BYTES;
                    res.header('Content-type', 'application/pdf');
                    sb.bufferToStream(blob).pipe(res);
                } else {
                    res.json(format.getFormatRes(false, null, 'not field BYTES'));
                }
            })
            .catch(err => {
                console.log('err=', err);
                getErrorHtml('Ошибка при открытии документа', 'Пожалуйста, обратитесь в регистратуру', res);
                return
//                    res.json(format.getFormatRes(false, null, err));
            });
    } else {
        res.json(format.getFormatRes(false, null, 'Not params'));
    }
});

module.exports = app;

