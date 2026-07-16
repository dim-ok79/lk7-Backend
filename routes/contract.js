const express = require('express');
const execute =  require('../utils/execute');
const app = express();
const logger = require('../utils/logger')('routeContract');
const format = require("../utils/format");
const sb = require('../utils/streamBuffer');
const fs = require('fs');
const path = require("path");
const cfg = require('../config');
const getErrorHtml = require("../utils/template").getErrorHtml;

const sql_contract_get_list_by_patient = "BEGIN "+cfg.db.packageName+".contract_get_list_by_patient(:p_patient_id, :cursor); END;";
const sql_contract_get_blob = "BEGIN "+cfg.db.packageName+".contract_get_blob(:p_patient_id, :p_contract_id, :cursor); END;";
const sql_contract_get_list_for_sig = "BEGIN "+cfg.db.packageName+".contract_get_list_for_sig(:patient, :cursor); END;";

const sql_contract_get_all = "BEGIN "+cfg.db.packageName+".contract_get_all(:cursor); END;";
const sql_contract_get_params = "BEGIN "+cfg.db.packageName+".contract_get_params(:patient, :cursor); END;";
const sql_contract_save_pdf = "BEGIN "+cfg.db.packageName+".contract_save_pdf(:p_patient_id, :p_template_id, :blob, :cursor); END;";


//const sql_get_contract_list_by_patient_size = "BEGIN "+packageName+".get_contract_list_by_patient_size(:patient, :cursor); END;";
const sql_save_contract = "BEGIN "+cfg.db.packageName+".save_contract(:patient, :template_id, :blob, :cursor); END;";

//const sql_get_contract_blob = "BEGIN "+packageName+".get_contract_blob(:patient, :p_contract_id, :blob); END;";
const sql_get_contract_blob = "BEGIN "+cfg.db.packageName+".get_contract_blob(:patient, :p_contract_id, :cursor); END;";


function exeBd$(sql, params) {
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


/**
 * @api {get} /contract/patient/list Список подписанных документов (TOKEN)
 * @apiGroup contract
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

app.get("/contract/patient/list", global.acsToken, function(req,res) {
    let user = global.getAuthUser(req);
// console.log('req.headers', req.headers);
// console.log('headers: ', req.headers.cookie);

    execute.executeRes(sql_contract_get_list_by_patient, {p_patient_id: user.patient_id})
        .then(result => {
            let r = format.assocArrayFromJSON(result);
//            res.cookie('TTEESSTT', '12444222CDE');  // Установить куки +
            res.json(format.getFormatRes(true, r, null));
        })
        .catch(err => {
            res.json(format.getFormatRes(false, null, err));
        });
});

/**
 * @api {get} /contract/patient/list/sig Список НЕ подписанных документов (TOKEN)
 * @apiGroup contract
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

app.get("/contract/patient/list/sig", global.acsToken, function(req,res) {
    let user = global.getAuthUser(req);
    execute.executeRes(sql_contract_get_list_for_sig, {patient: user.patient_id})
        .then(result => {
            let r = format.assocArrayFromJSON(result);
            res.json(format.getFormatRes(true, r, null));
        })
        .catch(err => {
            res.json(format.getFormatRes(false, null, err));
        });
});



/**
 * @api {get} /contract/patient/docpdf Получить подписанный документ PDF
 * @apiGroup contract
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

app.get("/contract/patient/docpdf", function(req,res) {
    let params = {p_patient_id: null, p_contract_id: null};
// console.log('req.query=', req.query);
    if (req.query && req.query.patientId && req.query.contractId) {
        params.p_patient_id = req.query.patientId;
        params.p_contract_id = req.query.contractId;

        execute.executeRes(sql_contract_get_blob, params)
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
                res.json(format.getFormatRes(false, null, err));
            });
//        res.json(format.getFormatRes(true, params, null));

    } else {
        res.json(format.getFormatRes(false, null, 'Not params'));
    }

});

/**
 * @api {get} /contract/template Получить документ (TOKEN)
 * @apiGroup contract
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
app.get("/contract/template", global.acsToken, function(req,res) {
    let user = global.getAuthUser(req);
//    console.log('user=', user);
//    console.log('res.query=', res.query);
    res.json(format.getFormatRes(false, null, null));
});

/** !!!
 * @api {post} /contract/template Подписать документ (TOKEN)
 * @apiGroup contract
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
app.post("/contract/template", global.acsToken, function(req,res) {
    let user = global.getAuthUser(req);
    let params = {patient: user.patient_id };
    execute.executeRes(sql_save_contract, {patient: user.patient_id})
        .then(result => {
            let r = format.assocArrayFromJSON(result);
            res.json(format.getFormatRes(true, r, null));
        })
        .catch(err => {
            res.json(format.getFormatRes(false, null, err));
        });
});

// Тест odt to pdf
/*
app.get("/contract/pdf", function(req,res) {
    const fs = require('fs');
    const carbone = require('carbone');
    // Data to inject
    var data = {
        family: 'ТЕСТЕР',
        firstname : 'Петров Иииван',
        lastname : 'ЛАСТ НАМЕ'
    };
    var options = {
        convertTo : 'pdf' //can be docx, txt, ...
    };

    carbone.render('E:/Work/PROJECT/personal_account_node/BackEnd/static/test.odt', data, options,function(err, result){
        if (err) {
            return console.log(err);
        }
        fs.writeFileSync('E:/Work/PROJECT/personal_account_node/BackEnd/static/result4.pdf', result);
        res.header('Content-type', 'application/pdf');
console.log('result.length=' , result.length);
        res.send(result);
        res.end();
    });
});
*/

// тест2 OTT
/*
app.get("/contract/test2", function(req,res) {
    var data = {
        dog_num: 'АБВ123',
        print_dat: '111222',
        fio: 'Сидоров Иван Петрович',
        addr1: 'sdfsdfsdf'
    };
    var options = {
        convertTo : 'pdf' //can be docx, txt, ...
    };

    const carbone = require('carbone');

    let pathODT = 'E:/Work/PROJECT/personal_account_node/BackEnd/dog1.odt';
    carbone.render(pathODT, data, options,function(err, result){
        if (err) {
            return console.log('render ERR=', err);
        }
//                sb.bufferToStream(result).pipe(fs.createWriteStream(path.resolve(path.resolve("E:/Work/PROJECT/personal_account_node/BackEnd/static/", `result12.pdf`))));
        res.header('Content-type', 'application/pdf');
        console.log('result.length=' , result.length);
        res.end(result);
    });

});
*/

// ЕПолучить список всех документов и сохранить во временной директории
const contract_get_all_to_file$ = function() {
    return exeBd$(sql_contract_get_all, {})
        .then(result => {
            logger.info(`Save contract count=${result.length}`);
            result.forEach(item =>{
                // Выгрузка в файлы
//                let filepath = path.resolve(`./tmpdoc/doc${item.template_id}.odt`);
                let filepath = path.resolve(`${cfg.odt.path_temp}/doc${item.template_id}.odt`);
                // Удаление не нужно, произойдет перезапись файла
//                fs.existsSync(filepath,function(err){
/*
                fs.stat(filepath, function (err, stats) {
                    fs.unlink(filepath,function(err){
                        if(err) return console.log(err);
//                    console.log(`Delete file=${filepath}`);
                        logger.info(`Delete file=${filepath}`);
                    });
                });
*/
                var outStream = fs.createWriteStream(filepath);
                outStream.on('error', function(err) { console.error(err); item.file = false});
                sb.bufferToStream(item.content).pipe(outStream);
                item.file = true;
                logger.info(`Save contract file=${filepath}`);
            });
            return Promise.resolve(result);
        })
        .then(res2 => {
            return Promise.resolve(res2);
        })
        .catch(err => {
console.log('Err1=', err)
            return Promise.reject(err);
        });
}


// Получить параметры для документа по пациенту
const contract_get_params$ = function(patientId) {
    return exeBd$(sql_contract_get_params, {patient: patientId})
}

// сохранение подписанного документа
const contract_save_pdf$ = function(patientId, templateId, blob) {
    return exeBd$(sql_contract_save_pdf, {p_patient_id: patientId, p_template_id: templateId, blob: blob});
}

/**
 * @api {post} /contract/all Получение всех шаблонов
 * @apiGroup contract
 * @apiVersion 0.0.1
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */
/* Сделанна для етста
app.post("/contract/all", function(req,res) {
    contract_get_all_to_file$()
        .then(result => {
            console.log('contract_get_all_to_file$ result=', result);
            res.json(format.getFormatRes(true, result, null));
        })
        .catch(err => {
            res.json(format.getFormatRes(false, null, err));
        });
});
*/

/**
 * @api {get} /contract/preview Пред просмотр документа
 * @apiGroup contract
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
// NOT FIX - Добавить проверку по кукам, что пользователь авторизировался
app.get("/contract/preview", function(req,res) {
//    console.log('preview query=', req.query);
    if (req.query && req.query.patientId && req.query.contractId) {
        contract_get_params$(req.query.patientId)
            .then(result => {
console.log('contract_get_params result=', result);
                let data = {};
                result.forEach( item => {
                    data[item.text] = item.value;
                });
                console.log('data=', data);

                var options = {
                    convertTo : 'pdf' //can be docx, txt, ...
                };

                const carbone = require('carbone');
//                let pathODT = `E:/Work/PROJECT/personal_account_node/BackEnd/tmpdoc/doc${req.query.contractId}.odt`;
                let pathODT = `${cfg.odt.path_temp}/doc${req.query.contractId}.odt`;
                logger.info('pathODT=' + JSON.stringify(pathODT));
                carbone.render(pathODT, data, options,function(err, resultDOC){
                    if (err) {
                        console.log('render ERR=', err);
                        logger.error('render ERR=' + JSON.stringify(err));
                        getErrorHtml('Ошибка при открытии документа', 'Пожалуйста, обратитесь в регистратуру', res);
//                        res.json(format.getFormatRes(false, null, err));
                        return
                    }
console.log('result111=', resultDOC);
                    res.header('Content-type', 'application/pdf');
                    console.log('result.length=' , resultDOC.length);
                    res.end(resultDOC);
                });
            })
            .catch(err => {
                // res.statusCode(404);
                logger.error('Запрос:' + JSON.stringify(err));
                getErrorHtml('Ошибка при открытии документа', 'Пожалуйста, обратитесь в регистратуру', res);
//                res.json(format.getFormatRes(false, null, err));
            });

    } else {
        getErrorHtml('Ошибка при открытии документа', 'Пожалуйста, обратитесь в регистратуру', res);
//        res.json(format.getFormatRes(false, null, 'Not params'));
    }
});

/**
 * @api {post} /contract/sig Подписание документа
 * @apiGroup contract
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
app.get("/contract/sig", function(req,res) {
    console.log('SIG query=', req.query);
    if (req.query && req.query.patientId && req.query.contractId) {
        // 1) Формируем документ
        contract_get_params$(req.query.patientId)
            .then(result => {
                console.log('result=', result);
                let data = {};
                result.forEach( item => {
                    data[item.text] = item.value;
                });
                console.log('data=', data);

                var options = {
                    convertTo : 'pdf' //can be docx, txt, ...
                };

                const carbone = require('carbone');
                let pathODT = `${cfg.odt.path_temp}/doc${req.query.contractId}.odt`;
                console.log('pathODT=', pathODT);
                carbone.render(pathODT, data, options,function(err, resultDOC){
                    if (err) {
                        logger.error('Ошибка сбора документа. -' + JSON.stringify(err));
                        res.json(format.getFormatRes(false, null, 'Ошибка сбора документа.'));
                        return
                    }
                    console.log('result111=', resultDOC);
                    console.log('result.length=' , resultDOC.length);
//                    contract_save_pdf$(req.query.patientId, req.query.contractId, resultDOC.toString())
                    contract_save_pdf$(req.query.patientId, req.query.contractId, resultDOC)
                        .then(resSave => {
                            console.log('resSave=', resSave);
                            res.json(format.getFormatRes(true, resSave[0], null));
//                            res.json(format.getFormatRes(false, null, 'Ошибка подписания документа.'));
                        })
                        .catch(errSave => {
                            logger.error('Ошибка подписания документа. -' + JSON.stringify(errSave));
                            res.json(format.getFormatRes(false, null, 'Ошибка подписания документа.'));
                        });
                });
            })
            .catch(err0 => {
                logger.error('Ошибка сбора информации. -' + JSON.stringify(err0));
                res.json(format.getFormatRes(false, null, 'Ошибка сбора информации.'));
            });

        // 2) Сохраняем в БД

    } else {
        res.json(format.getFormatRes(false, null, 'Not params'));
    }

});

// Тест куки +
/*
function parseCookies(str) {
    let rx = /([^;=\s]*)=([^;]*)/g;
    let obj = { };
    for ( let m ; m = rx.exec(str) ; )
        obj[ m[1] ] = decodeURIComponent( m[2] );
    return obj;
}
*/


/*
app.get("/contract/getTESTcookie", function(req,res) {
    console.log('headers: ', req.headers.cookie);
    let cookies = parseCookies( req.headers.cookie );
    console.log('Cookie pars: ', cookies);
    console.log('Cookie pars Patient: ', cookies.Patient);
    res.json(format.getFormatRes(false, null, cookies));
//    res.send('Get Cookie');
});
*/

/*
app.get("/contract/setTESTcookie", function(req,res) {
//    let c = {}
    res.cookie('Patient', '12444222CDE');  // Установить куки +
    res.cookie('Talon', '46661112cr5t');  // Установить куки +

    res.json(format.getFormatRes(true, {}, null));
});
*/


// Загрузка документов в файлы
setTimeout(function () {
        contract_get_all_to_file$()
            .then(result => {
                let strRes = JSON.stringify(result);
                if (strRes.length > 150) {
                    strRes = strRes.slice(0, 150) + '...';
                }
                logger.info('Документы загруженны =' + strRes);
            })
            .catch(err => {
                logger.error('Ошибка загрузки документов =' + JSON.stringify(err))
            });
    }
, 10000);

module.exports = app;
