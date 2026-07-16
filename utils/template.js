const fs = require("fs");
const logger = require('../utils/logger')('template');
const execute =  require('../utils/execute');
const format = require("../utils/format");
const cfg = require('../config');
const moment = require('moment');

const tmp_app_config = './template/app.config.template';
const tmp_err_html = './template/ErroPdf.html';
const tmp_visit_html = './template/visitPdf.html';

const PAR_START = '$P{';
const PAR_END = '}';

const sql_get_param = "BEGIN "+cfg.db.packageName+".get_param(:p_code, :cursor); END;";

/* Получение параметра из БД */
function get_param$(code){
//    console.log('code=', code.length);
    return new Promise((resolve, reject) => {
        execute.executeRes(sql_get_param, {p_code: code})
            .then(result => {
                let r = format.assocArrayFromJSON(result);
                resolve(r);
            })
            .catch(err => {
                reject(err);
            });
    })
};

// Выборка параметров
function findParam(str){
    let arrayParams = [];
    let strTMP = str;
    let tmpStr, str_repl = '';
    let PAR_start_i, PAR_end_i;

//    while (strTMP.indexOf(PAR_START)!== -1 && strTMP.indexOf(PAR_END)>0) {
    while (strTMP.indexOf(PAR_START) > 0 && strTMP.indexOf(PAR_END)>0) {
        PAR_start_i = strTMP.indexOf(PAR_START);
        tmpStr = strTMP.slice(PAR_start_i);
        PAR_end_i = tmpStr.indexOf(PAR_END);
        if (PAR_start_i !== -1 && PAR_end_i > 3) {
//            str_repl = strTMP.slice(PAR_start_i, PAR_end_i + PAR_start_i + 1);
            str_repl = strTMP.slice(PAR_start_i + PAR_START.length, PAR_end_i + PAR_start_i);
            arrayParams.push({param: str_repl, value: null});
        }
        strTMP = strTMP.slice(PAR_end_i + PAR_start_i + 2);
    }
    return arrayParams;
}


function setParams$(str){
    let resParams = [];
    const promises = [];

    return new Promise((resolve, reject) => {
    let params = findParam(str); // Получаем список параметров
    params.forEach(item => {
        promises.push(get_param$(item.param));
    });

//console.log('str=', str);
    Promise.all(promises)
        .then(res =>{
            params.forEach((item, i) => {
                try {
                    const r = res[i][0];
                    item.value = r.pval;
                    if (r && r.ptype && r.pval){
                        if (r.ptype == '0'){
                            let tmp_str = '';
                            tmp_str = r.pval;

                            tmp_str = tmp_str.replace(/\"/g, "'").trim();
                            tmp_str = tmp_str.replace(/\n/g, '');
                            item.value = '"'+tmp_str+'"';
                        } else {
                            item.value = r.pval;
                        }
                    } else {
                        item.value = null;
                    }
                    str = str.replace(PAR_START+item.param+PAR_END, item.value);
                } catch (err) {
                    logger.error('Ошибка получения параметра:' + item.param);
                    str = str.replace(PAR_START+item.param+PAR_END, 'null');
                }
            });
//            console.log('params=', params);
            resolve(str);
        })
        .catch(err => {
            console.log('ERR=', err);
            reject(err);
        });

    });
}

function readAppConfig() {
    console.log('222');

    return new Promise((resolve, reject) => {
        try {
        const data = fs.readFileSync(tmp_app_config, 'utf8');
        logger.info(`${tmp_app_config} - OK`);
        setParams$(data)
            .then(r => {
                resolve(r);
            })
            .catch(err => {
                logger.error(`Ошибка получения данных =` + JSON.stringify(err));
                reject(`Ошибка получения данных =` + JSON.stringify(err));
            });
        } catch (err) {
                logger.error(`Файл ${tmp_app_config} не удалось прочитать =` + JSON.stringify(err));
            reject(`Файл ${tmp_app_config} не удалось прочитать =` + JSON.stringify(err));
        }

    });
};

/* Вывод ошибки формирования в HTML
* txt1 - 1 заголовок текст
* txt2 - 2 текст
* btnTxt - Текст на кнопке
* */

function getErrorHtml(txt1, txt2, res){
    try {
        let data = fs.readFileSync(tmp_err_html, 'utf8');
        logger.info(`${tmp_err_html} - OK`);
        // Замена
        data = data.replace('[txt1]', txt1);
        data = data.replace('[txt2]', txt2);
        res.send(data);
/*
        setParams$(data)
            .then(r => {
                resolve(r);
            })
            .catch(err => {
                logger.error(`Ошибка получения данных =` + JSON.stringify(err));
                reject(`Ошибка получения данных =` + JSON.stringify(err));
            });
*/

    } catch (err) {
        logger.error(`Файл ${tmp_err_html} не удалось прочитать =` + JSON.stringify(err));
        reject(`Файл ${tmp_err_html} не удалось прочитать =` + JSON.stringify(err));
    }

}

function getVisitHtml(p_num, p_fio, p_time, p_bar_code){
    try {
        let data = fs.readFileSync(tmp_visit_html, 'utf8');
        logger.info(`Загружен ${tmp_visit_html} - OK, length= ${data.length}`);
        // Замена
        data = data.replace('[p_num]', p_num);
        data = data.replace('[p_fio]', p_fio);
        // преобразование из 26.06.1990 в YYYY-MM-DD
        moment.locale('ru');
        let dt = moment(p_time, 'DD.MM.YYYY HH:mm').format('DD MMMM YYYY, HH:mm');
        data = data.replace('[p_time]', dt);
        data = data.replace('[p_bar_code]', p_bar_code);
        return data;
    } catch (err) {
        console.error(err);
        logger.error(`Файл ${tmp_visit_html} не удалось прочитать =` + JSON.stringify(err));
        reject(`Файл ${tmp_visit_html} не удалось прочитать =` + JSON.stringify(err));
    }

}


module.exports.readAppConfig = readAppConfig;
module.exports.getErrorHtml = getErrorHtml;
module.exports.getVisitHtml = getVisitHtml;

