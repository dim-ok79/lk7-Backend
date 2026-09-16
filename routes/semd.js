const express = require('express');
const execute =  require('../utils/execute')
const app = express();
const logger = require('../utils/logger')('route-semd');
const format = require("../utils/format");
const sb = require('../utils/streamBuffer');
var cfg = require('../config');
const getErrorHtml = require("../utils/template").getErrorHtml;
const getVisitHtml = require("../utils/template").getVisitHtml;
const jwt = require('jsonwebtoken');

var htmlToPdf = require('html-pdf');

const sql_get_semd_list_by_visit = "BEGIN "+cfg.db.packageName+".get_semd_list_by_visit(:visit_id, :cursor); END;";
const sql_get_semd_visit = "BEGIN "+cfg.db.packageName+".get_semd_visit(:doc_id, :cursor); END;";

const cookieParser = require('cookie-parser');
app.use(cookieParser()); // Подключаем парсер куки

// Тест куки +
function parseCookies(str) {
    let rx = /([^;=\s]*)=([^;]*)/g;
    let obj = { };
    for ( let m ; m = rx.exec(str) ; )
        obj[ m[1] ] = decodeURIComponent( m[2] );
    return obj;
}

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


/*  Информация о Визите в html*/
function get_doc(p_doc_id) {
    let params = {doc_id: p_doc_id};
    return  exeBd(sql_get_semd_visit, params)
}




/**
 * @api {get} /semd/list Список СЭМДов по визиту (TOKEN)
 * @apiGroup semd
 * @apiVersion 0.0.1
 *
 * @apiHeader {String} Authorization Authorization: TOKEN *AUTH_TOKEN*
 * @apiParam {String} visit_id  Визит ID
 *
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */

app.get("/semd/list", global.acsToken, (req,res) => {
//    let user = global.getAuthUser(req);
    res.cookie('user', 'alex', {
        maxAge: 900000, // Время жизни в миллисекундах (15 минут)
        httpOnly: true  // Защита от доступа через JavaScript в браузере
    });

    res.cookie('Patient', '12444222CDE');  // Установить куки +

    if (req.query && req.query.visitID) {
        let params = {visit_id: req.query.visitID};
        execute.executeRes(sql_get_semd_list_by_visit, params)
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
 * @api {get} /semd/:tp/:id.pdf Описание посещения пациента PDF
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

app.get("/semd/:tp/:id.pdf", function(req,res) {
//    console.log('+++++++TP=', req.params['tp']); // тип
//    console.log('+++++++Id=', req.params['id']); // id
    if (req.params && req.params['tp'] && req.params['id']) {
        let l_id = req.params['id'];
        let l_type = req.params['tp'];

        get_doc(l_id)
            .then(resQ => {
// console.log('!!! resQ=', resQ);
                if (resQ && resQ.length>0) {
                    let txt = '';
                    resQ.forEach(item => {
                        txt =  txt + item.file_clob;
                    });

/*
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
*/

                    htmlToPdf.create(txt).toStream(function(err, stream){
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

    } else {
        getErrorHtml('Ошибка формирования заключения', 'Пожалуйста, обратитесь в регистратуру');
    }
});


app.get("/semd/test", global.acsToken, (req,res) => {
//    let user = global.getAuthUser(req);
    const username = req.cookies.user;
    console.log('COOKIES =', req.cookies);
    console.log('COOKIES username=', username);
    console.log('headers cookie: ', req.headers.cookie);

    console.log('headers cookie parseCookies: ', parseCookies(req.headers.cookie));

    res.json(format.getFormatRes(true, {}, null));

//        res.json(format.getFormatRes(false, null, 'Not params'));
});

module.exports = app;
