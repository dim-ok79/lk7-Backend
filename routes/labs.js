const express = require('express');
const execute =  require('../utils/execute')
const app = express();
const logger = require('../utils/logger')('route-labs');
const format = require("../utils/format");
const getErrorHtml = require("../utils/template").getErrorHtml;
var cfg = require('../config');

const sql_lab_orders_size = "BEGIN "+cfg.db.packageName+".lab_orders_size(:patient, :dat_from, :dat_to, :cursor); END;";
const sql_lab_orders = "BEGIN "+cfg.db.packageName+".lab_orders(:patient, :dat_from, :dat_to, :start, :end, :orderbyasc, :cursor); END;";
const sql_lab_result = "BEGIN "+cfg.db.packageName+".get_lab_result(:research_id, :cursor); END;";
const sql_get_lab_document_info = "BEGIN "+cfg.db.packageName+".get_lab_document_info(:patient, :research_id, :cursor); END;";
const sql_get_lab_document_file = "BEGIN "+cfg.db.packageName+".get_lab_document_file(:patient, :research_id, :file_id, :file_type,  :cursor); END;";
const sql_get_lab_result_html = "BEGIN "+cfg.db.packageName+".get_lab_result_html(:research_id, :cursor); END;";




/**
 * @api {get} /labs/orders Cписок лабораторных заказов по пациенту (TOKEN)
 * @apiGroup labs
 * @apiVersion 0.0.1
 *
 * @apiHeader {String} Authorization Authorization: TOKEN *AUTH_TOKEN*
 *
 * @apiParam {String} [beginDate]  Дата с (формат даты YYYY-MM-DD = 2015-02-01)
 * @apiParam {String} [endDate]  Дата по (формат даты YYYY-MM-DD = 2015-02-01)
 * @apiParam {Number} [start]  Пагинация, с какой записи
 * @apiParam {Number} [end]  Пагинация, по какую запись
 * @apiParam {String} [orderby]  Порядок показа (acs / desc)
 *
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */
app.get("/labs/orders", global.acsToken, function(req,res) {
    let user = global.getAuthUser(req);
    let params = {patient: user.patient_id, dat_from: null, dat_to: null, start: null, end: null, orderbyasc:1};

    if (req.query) {
        if (req.query.beginDate)  { params.dat_from = req.query.beginDate};
        if (req.query.endDate)  { params.dat_to = req.query.endDate};
        if (req.query.start)  { params.start = req.query.start};
        if (req.query.end)  { params.end = req.query.end};
        if (req.query.orderby)  {
            if (req.query.orderby !== 'acs') {
                params.orderbyasc = 0;
            }
        };

        execute.executeRes(sql_lab_orders, params)
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
 * @api {get} /labs/orders/size Количество лаб заказов (TOKEN)
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

app.get("/labs/orders/size", global.acsToken, function(req,res) {
    let user = global.getAuthUser(req);
    let params = {patient: user.patient_id, dat_from: null, dat_to: null};

    if (req.query) {
        if (req.query.beginDate)  { params.dat_from = req.query.beginDate};
        if (req.query.endDate)  { params.dat_to = req.query.endDate};
console.log('LAB TEST1');
        execute.executeRes(sql_lab_orders_size, params)
            .then(result => {
console.log('LAB TEST1 res=', result);

                let r = format.assocArrayFromJSON(result);
                res.json(format.getFormatRes(true, r[0], null));
            })
            .catch(err => {
console.log('LAB TEST1 err=', err);
                res.json(format.getFormatRes(false, null, err));
            });

    } else {
        res.json(format.getFormatRes(false, null, 'Not params'));
    }
});

/**
 * @api {get} /labs/research список результатов (TOKEN)
 * @apiGroup labs
 * @apiVersion 0.0.1
 *
 * @apiHeader {String} Authorization Authorization: TOKEN *AUTH_TOKEN*
 *
 * @apiParam {String} [researchid]  ID Заказа
 *
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */

app.get("/labs/research", global.acsToken, function(req,res) {
    let params = {research_id: 0};

    if (req.query.researchid) {
        params.research_id = req.query.researchid;

/*
        var valdbService = req.app.get('valdbService');
        console.log('valdbService=', valdbService);
        res.json(format.getFormatRes(true, null, null));
*/

        execute.executeRes(sql_lab_result, params)
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
 * @api {get} /labs/research/html список результатов (TOKEN)
 * @apiGroup labs
 * @apiVersion 0.0.1
 *
 * @apiHeader {String} Authorization Authorization: TOKEN *AUTH_TOKEN*
 *
 * @apiParam {String} [researchid]  ID Заказа
 *
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */

app.get("/labs/research/html", global.acsToken, function(req,res) {
    let params = {research_id: 0};
    if (req.query.researchid) {
        params.research_id = req.query.researchid;
        execute.executeRes(sql_get_lab_result_html, params)
            .then(result => {
                if (result.length > 0 && result[0].TEXT){
                    let text = result[0].TEXT;
                    text = text.replace(/\r?\n|\r/g, '');
//                    console.log('text=', text);
                    res.json({
                        success: true,
                        data: text,
                        msg: null
                    });
//                    res.json(format.getFormatRes(true, text, null));
                } else {
                    res.json(format.getFormatRes(false, null, 'Not field TEXT'));
                }
            })
            .catch(err => {
                res.json(format.getFormatRes(false, null, err));
            });

    } else {
        res.json(format.getFormatRes(false, null, 'Not params'));
    }
});

/**
 * @api {get} /labs/research/files Список файлов лаб заказа (TOKEN)
 * @apiGroup labs
 * @apiVersion 0.0.1
 *
 * @apiHeader {String} Authorization Authorization: TOKEN *AUTH_TOKEN*
 *
 * @apiParam {String} [researchid]  ID Заказа
 *
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */

app.get("/labs/research/files", global.acsToken, function(req,res) {
    let user = global.getAuthUser(req);
    let params = {patient: user.patient_id, research_id: null};

    if (req.query.researchid) {
        params.research_id = req.query.researchid;
        execute.executeRes(sql_get_lab_document_info, params)
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
 * @api {get} /labs/research/:researchid/patient/:patientid/file/:fileid/type/:filetype/:namefile Получить PDF лаб-заказа из внешней системы
 * @apiGroup labs
 * @apiVersion 0.0.1
 *
 * @apiParam {Number} patientid  ID пациента
 * @apiParam {String} researchid  ID Заказа
 * @apiParam {Number} fileid  ID файла
 * @apiParam {String} filetype  Тип файла (LAB_RESEARCH_DOCUMENT, DOCUMENTS, LAB_RESULT_IMAGE)
 * @apiParam {String} namefile  Наименование файла (*.pdf)
 *
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */

app.get("/labs/research/:researchid/patient/:patientid/file/:fileid/type/:filetype/:namefile", function(req,res) {
    if (req.params
        && req.params.researchid
        && req.params.fileid
        && req.params.filetype
        && req.params.namefile
        && req.params.patientid
    ) {
        let params = {patient: req.params.patientid, research_id: req.params.researchid, file_id: req.params.fileid, file_type: req.params.filetype};
        execute.executeRes(sql_get_lab_document_file, params)
            .then(result => {
                let r = format.assocArrayFromJSON(result);
                console.log('r=', r);
                if (r && r[0] && r[0].content) {
                    var buf = Buffer.from(r[0].content,'base64');
                    res.contentType("application/pdf");
                    res.send(buf);
                } else {
                    logger.error(`SQL sql_get_lab_document_file not field content`);
                    getErrorHtml('Ошибка формирования результата лабораторного заказа', 'Пожалуйста, обратитесь в регистратуру', res);
                }
            })
            .catch(err => {
                logger.error(`SQL sql_get_lab_document_file=${JSON.stringify(err)}`);
                getErrorHtml('Ошибка формирования результата лабораторного заказа', 'Пожалуйста, обратитесь в регистратуру', res);
            });
    } else {
        logger.error(`Not params query=${JSON.stringify(req.query)}`);
        getErrorHtml('Ошибка формирования результата лабораторного заказа', 'Пожалуйста, обратитесь в регистратуру', res);
    }

});

module.exports = app;

