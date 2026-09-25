const express = require('express');
const execute =  require('../utils/execute')
const app = express();
const logger = require('../utils/logger')('route-reportServ');
const cfg = require('../config');
const getErrorHtml = require("../utils/template").getErrorHtml;
var htmlToPdf = require('html-pdf');
const sql_count_research_patient = "BEGIN "+cfg.db.packageName+".count_research_patient(:p_patient_id, :p_research_id, :cursor); END;";
const sql_get_lab_result_html = "BEGIN "+cfg.db.packageName+".get_lab_result_html(:research_id, :cursor); END;";

const text_header = "<div style=\"text-align: center;\">\n" +
    "        <h2>ФГБУ СЗОНКЦ им. Л.Г. Соколова ФМБА России</h2>\n" +
    "        <h3>Санкт-Петербург, просп. Культуры, д. 4</h3>\n" +
    "        <br>\n" +
    "        <br>\n" +
    "    </div>" +
    "";

const text_footer = "<div style=\"text-align: center;\">\n" +
    "Результат лабораторного исследования НЕ ЯВЛЯЕТСЯ ДИАГНОЗОМ. Согласно Федеральному закону №323-ФЗ от\n" +
    "21.11.2011 'Об основах здоровья граждан в Российской Федерации' диагноз устанавливает лечащий врач, используя\n" +
    "информацию о пациенте: данные осмотра, анамнеза, других лабораторных и инструментальных исследований.\n" +
    "</div>";

const text_patient_info = "<table style='border-collapse: collapse;'>\n" +
    "        <tr>\n" +
    "            <td style=\"border: 1px solid black;padding: 5px;\">\n" +
    "                ФИО:</br>\n" +
    "                Рожд:</br>\n" +
    "                Адрес:</br>\n" +
    "            </td>\n" +
    "            <td style=\"border: 1px solid black;padding: 5px;\">\n" +
    "                <div>[p_fio]</div>\n" +
    "                <div>[p_birthdatestr] ([p_age] лет)</div>\n" +
    "                <div>[p_adr]</div>\n" +
    "            </td>\n" +
    "            <td style=\"border: 1px solid black;padding: 5px;\">\n" +
    "                Пол:</br>\n" +
    "                № карты:</br>\n" +
    "                Ист. фин:</br>\n" +
    "            </td>\n" +
    "            <td style=\"border: 1px solid black;padding: 5px;\">\n" +
    "                <div>[p_sex]</div>\n" +
    "                <div>[p_num]</div>\n" +
    "                <div>&nbsp;</div>\n" +
    "            </td>\n" +
    "        </tr>\n" +
    "    </table>"
;
/*
mpatientInfo={
"NUM":583929,
"LASTNAME":"Забаев",
"FIRSTNAME":"Вадим",
"SECONDNAME":"Андреевич",
"BIRTHDATESTR":"29.11.1993",
"PHONE":null,
"CELLULAR":"+7(921)3548550",
"EMAIL":"vadim@med122.com",
"SNILS":"170-632-812 51",
"ADDRESS_PROJ":"СПб, Приморский р-н р-н, Суздальское шоссе, д.24, к.3 стр.1, кв.13",
"COUNT_LOGIN":1,
"SEX":0,
"AGE":31,
"COL":1}
*/

const setParam = (strParam, param, text) => {
    if (!!param) {
        text = text.replace(strParam, param);
    } else {
        text = text.replace(strParam, '&nbsp;');
    }
    return text;
}

const generPatientInfo = (patientInfo) => {
        let text = text_patient_info;

// logger.info('patientInfo=' + JSON.stringify(patientInfo));
        let fio = `${patientInfo.LASTNAME} ${patientInfo.FIRSTNAME} ${patientInfo?.SECONDNAME}`
        text = text.replace('[p_fio]', fio);

        text = setParam('[p_adr]', patientInfo.ADDRESS_PROJ, text);
        text = setParam('[p_age]', patientInfo.AGE, text);
        text = setParam('[p_birthdatestr]', patientInfo.BIRTHDATESTR, text);
        text = setParam('[p_num]', patientInfo.NUM, text);
        if (!!patientInfo.SEX) {
            text = text.replace('[p_sex]', 'Женский');
        } else {
            text = text.replace('[p_sex]', 'Мужской');
        }


// logger.info('TEXT=' + text);
        return text;
    }
/**
 * @api {post} /report/pdf Получить PDF лабораторного заказа
 * @apiGroup report
 * @apiVersion 0.0.1
 *
 * @apiParam {String} research  Заказ (ID)
 * @apiParam {String} patient_id  Пациент (ID)
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */

//    http://10.0.0.204:8080/pa-web/api/report/pdf/lab/patient/384551420/research/441074526485/21082674526485.pdf -- Док
//    http://10.0.0.204:8080/pa-web/api/report/pdf/lab/patient/384551420/research/441074526486/2021082601.pdf  -- Материал

app.get("/report/pdf/:tmptoken/:research", global.acsTmpToken, function(req,res) {
    let user = global.getAuthUserTmpToken(req);
    console.log('REPORT user=', user);
    if (req.params && req.params.research) {
        let research_id = req.params.research.substr(0, req.params.research.indexOf('.pdf'));
        execute.executeRes(sql_count_research_patient, {
            p_patient_id: user.patient_id,
            p_research_id: research_id
        })
            .then(result_info => {
                if (result_info && result_info.length>0 && result_info[0].COL >0){
                    // Проверку прошел, работаем
                    let params = {research_id: 0};
                    if (research_id) {
                        params.research_id = research_id;
                        execute.executeRes(sql_get_lab_result_html, params)
                            .then(result => {
                                if (result.length > 0 && result[0].TEXT){
                                    let text = result[0].TEXT;
                                    text = text.replace(/\r?\n|\r/g, '');
// console.log('generPatientInfo(result_info)=', generPatientInfo(result_info));
                                    /*
                                                                        try {
                                                                            var ttt = generPatientInfo(result)
                                                                        } catch (errtest) {
                                                                            console.log('errtest', errtest);
                                                                        }
                                    */


                                    var html = '<!DOCTYPE html>\n' +
                                        '<html lang="en">\n' +
                                        '<head>\n' +
                                        '    <meta charset="UTF-8">\n' +
                                        '    <title></title>\n' +
                                        '</head>\n' +
                                        '<body>\n' +
                                        text_header +
                                        generPatientInfo(result_info[0]) +
                                        '<br>\n' +
                                        '<h2>Результаты исследований</h2>'+
                                        text +
                                        text_footer +
                                        '</body>\n' +
                                        '</html>\n';
//                                    console.log('html=', html);

                                    htmlToPdf.create(html).toStream(function(err, stream){
                                        if (err) {
                                            logger.error('htmlToPdf ERR=' + JSON.stringify(err));
                                            getErrorHtml('Ошибка формирования заключения', 'Пожалуйста, обратитесь в регистратуру', res);
                                        } else {
                                            res.contentType('application/pdf');
                                            stream.pipe(res);
                                        }
                                    });
////111111
                                } else {
                                    getErrorHtml('Ошибка формирования заключения', 'Пожалуйста, обратитесь в регистратуру', res);
                                }
                            })
                            .catch(err => {
                                getErrorHtml('Ошибка формирования заключения', 'Пожалуйста, обратитесь в регистратуру', res);
                            });

                    } else {
                        getErrorHtml('Ошибка формирования заключения', 'Пожалуйста, обратитесь в регистратуру', res);
                    }
                } else {
                    getErrorHtml('Ошибка формирования результата лабораторного заказа? не найден пациент', 'Пожалуйста, обратитесь в регистратуру', result);
                }
            })
            .catch(errCount => {
                getErrorHtml('Ошибка формирования результата лабораторного заказа', 'Пожалуйста, обратитесь в регистратуру', errCount);
            })
    }
});

module.exports = app;
