const express = require('express');
const execute =  require('../utils/execute')
const app = express();
const logger = require('../utils/logger')('route-api');
const format = require("../utils/format");

const captcha =  require('../utils/captcha');
var captchapng = require('captchapng');

const jwt = require('jsonwebtoken');
const cfg = require('../config');

const sql_lpu_info = "BEGIN "+cfg.db.packageName+".lpu_info(:cursor); END;";
const sql_login = "BEGIN "+cfg.db.packageName+".login(:login, :passwd, :cursor); END;";
const sql_reg = "BEGIN "+cfg.db.packageName+".create_patient_registration(" +
    ":p_lastname, " +
    ":p_firstname, " +
    ":p_secondname, " +
    ":p_birthdate, " +
    ":p_email, " +
    ":p_phone, " +
    ":p_sex, " +
    ":p_snuls, " +
    ":p_inn, " +
    ":p_iin, " +
    ":p_card, " +
    ":p_tab_num, " +
    ":p_polis_num, " +
    ":p_polis_ser, " +
    ":cursor); END;";

const sql_change_password = "BEGIN "+cfg.db.packageName+".change_password(:p_patient_id, :p_old_pwd, :p_new_pwd, :cursor); END;";
const sql_find_patient_change_password = "BEGIN "+cfg.db.packageName+".find_patient_change_password(:p_lastname, :p_firstname, :p_secondname, :p_birthdate, :p_email , :cursor); END;";
const sql_send_email_change_password = "BEGIN "+cfg.db.packageName+".send_email_change_password(:p_patient_id, :cursor); END;";

const sql_check_token_recovery = "BEGIN "+cfg.db.packageName+".check_token_recovery(:p_token, :cursor); END;";
const sql_change_password_by_token = "BEGIN "+cfg.db.packageName+".change_password_by_token(:p_token, :p_new_pwd, :cursor); END;";

const sql_get_patient_ext = "BEGIN "+cfg.db.packageName+".get_patient_ext(:p_patient_id, :cursor); END;";

const sql_get_patient_for_phone = "BEGIN "+cfg.db.packageName+".get_patient_for_phone(:p_phone, :cursor); END;";

const sql_patient_info = "BEGIN "+cfg.db.packageName+".patient_info(:p_patient_id, :cursor); END;";
const sql_get_family = "BEGIN "+cfg.db.packageName+".get_family(:patient, :cursor); END;";

function exeBd(sql, params) {
        return execute.executeRes(sql, params);
}


/**
 * @api {get} /api/lpuinfo Информация о лечебном учреждении
 * @apiGroup api
 * @apiVersion 0.0.1
 *
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */
app.get("/api/lpuinfo", function(req,res) {
    execute.executeRes(sql_lpu_info, req.query)
        .then(result => {
            res.json(format.getFormatRes(true, result, null));
        })
        .catch(err => {
            res.json(format.getFormatRes(false, null, err));
            console.log('ERRR=', err);
        });

});

function getPatientEXT(patient_id) {
    return exeBd(sql_get_patient_ext, {p_patient_id: patient_id});
}

/**
 * @api {post} /api/login Авторизация
 * @apiGroup api
 * @apiVersion 0.0.1
 *
 * @apiParam {String} login - логин
 * @apiParam {String} passwd - пароль
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */
app.post("/api/login", function(req,res) {
    execute.executeRes(sql_login, req.body)
        .then(result => {
            logger.info('login res=' + JSON.stringify(result));
// console.log('executeRes result=', result);
//            let tmp = format.assocArrayFromJSON(result);
            let tmp = result;
            tmp = tmp[0];
// console.log('tmp=', tmp);
            if (tmp.PATIENT_ID && tmp.PATIENT_ID>0) {
                const user = { patient_id: tmp.PATIENT_ID, solid: cfg.token.solid_text};
                /!*  генерим токен *!/
                const token = jwt.sign(user, cfg.token.JWT_SECRET, {
                    expiresIn: cfg.token.lifetime
                })

                // Создаем сессию
                let s = global.session.add(token, tmp.PATIENT_ID, req);

                // Склеиваем данные
                let r = Object.assign( {token:token} , {patientId: tmp.PATIENT_ID});

// Получаем доп параметры относитель пациента
                getPatientEXT(tmp.PATIENT_ID)
                    .then(resExt => {
                        r = Object.assign(r, {ext: resExt});
                        res.json(format.getFormatRes(true, r, null));
                        global.LogUrl(req, 1, tmp.PATIENT_ID, s);
                    })
                    .catch(errExt => {
                        r = Object.assign(r, {ext: []});
                        res.json(format.getFormatRes(true, r, null));
                        global.LogUrl(req, 1, tmp.PATIENT_ID, s);
                    });

            } else {
                res.json(format.getFormatRes(false, null, null));
                global.LogUrl(req, 0);
            }
        })
        .catch(err => {
            res.json(format.getFormatRes(false, null, err));
            console.log('ERRR=', err);
        });
});

/**
 * @api {get} /api/logout Выход
 * @apiName  Выход
 * @apiGroup api
 * @apiVersion 0.0.1
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */
app.post("/api/logout", function(req,res) {
    // Удаляем сессию
    global.session.deleteToReq(req);

    res.json(format.getFormatRes(true, null, null));
});

/**
 * @api {post} /api/patient Регистрация пациента
 * @apiGroup api
 * @apiVersion 0.0.1
 *
 * @apiParam {String} lastName='' - фамилия
 * @apiParam {String} firstName='' - имя
 * @apiParam {String} secondName='' - отчество
 * @apiParam {String} birthDate='' - дата рождения в формате dd_MM_yyyy
 * @apiParam {String} email='' - электронная почта
 * @apiParam {String} phone='' - телефон
 * @apiParam {String} sex='' - пол (1-Ж, 0-М)
 * @apiParam {String} phone='' - телефон
 * @apiParam {String} snils='' - СНИЛС
 * @apiParam {String} inn='' - ИНН
 * @apiParam {String} [iin=''] - ИИН (для Казахстана)
 * @apiParam {String} [card=''] - номер карты пациента
 * @apiParam {String} [tabNum=''] - табельный номер с места работы
 * @apiParam {String} [polisNum=''] - номер медицинского полиса
 * @apiParam {String} [polisSer=''] - серия медицинского полиса
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */
app.post("/api/patient", function(req,res) {
    let params = {p_lastname: null, p_firstname: null, p_secondname: null, p_birthdate: null, p_email: null, p_phone: null
        ,p_sex: null, p_snuls: null, p_inn: null, p_iin: null, p_card: null, p_tab_num: null, p_polis_num: null, p_polis_ser: null};

    logger.info('req.body=' + JSON.stringify(req.body));

    let f_captcha = false; // Флаг проверки капчи

    if (f_captcha == false && req.body && req.body.captcha && req.body.captchaSolid) {
        let c = captcha.get(req.body.captchaSolid);   // Ищем КАПЧУ
        if (c && c>10 && c == req.body.captcha) {
            f_captcha = true;
        }
    };


    if (req.body && (f_captcha) ) {
            captcha.get(req.body.captcha);  // удаляем капчу из списка
            if (req.body.lastName)  { params.p_lastname = req.body.lastName;}
            if (req.body.firstName) { params.p_firstname = req.body.firstName;}
            if (req.body.secondName) { params.p_secondname = req.body.secondName;}
            if (req.body.email) { params.p_email = req.body.email;}
            if (req.body.phone) { params.p_phone = req.body.phone;}
            if (req.body.snils) { params.p_snuls = req.body.snils;}
            if (req.body.birthDate) { params.p_birthdate = req.body.birthDate;}

            console.log('params=', params);

            execute.executeRes(sql_reg, params)
                .then(result => {
                    const tmp = format.assocArrayFromJSON(result);
                    res.json(format.getFormatRes(true, tmp[0], null));
                })
                .catch(err => {
                    res.json(format.getFormatRes(false, null, err));
                });
    } else {
        res.json(format.getFormatRes(false, null, 'CaptchaError'));
    }

});

/**
 * @api {get} /api/app.config Параметры системы
 * @apiGroup api
 * @apiVersion 0.0.1
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */
app.get("/api/app.config", function(req,res) {
//    execute.executeQuery( sql_device_list, res, req.query)
    const ress = {
        "menu": {
            "items": "to-doctor,h-doctor,laboratory,history,services,payments,abonements"
        },
        "pages": {
            "login": {
                "title": null,
                "listAuth": "договор1,http://mail.ru;договор2, http://ya.ru",
                "DogInfo": "С условиями договора, ознакомлен.",
                "DogPREVIEW_REQUIRED": false,
                "CreatePatient": true,
                "CreatePatientListParams": "lastName*;firstName*;secondName;snils*;birthDate*;email*;phone*;sex",
                "InfoReg": "<div>После прохождения регистрации на сайте вам будут высланы на электронную почту логин и пароль к личному кабинету</div>\n    <div>Логин и пароль генерируются автоматически для обеспечения безопасности данных пациентов</div>\n    <div>За 30 минут до приема просим вас обратиться в окно регистратуры и предоставить оригиналы документов:</div>\n    <ul>\n        <li class=\"cls-test1\">Паспорт</li>\n        <li class=\"cls-test2\">Медицинский страховой полис</li>\n        <li class=\"cls-test3\">СНИЛС</li>\n    </ul>",
                "Auth_type": 0
            },
            "home": {
                "title": null
            },
            "abonements": {
                "title": "Здесь АБОНЕМЕНТЫ",
                "Pay": {
                    "showbalans": true,
                    "showFieldrealAmount": true
                },
                "showSostav": true
            },
            "laboratory": {
                "title": null,
                "showPayerInfo": false,
                "WEB_LK_LAB_TYPE": 2,
                "WEB_LK_LAB_SHOW_RES_ONLY_PDF": false
            },
            "history": {
                "title": null
            },
            "personal": {
                "title": null,
                "WEB_LK_ACCESS_STATEMENT": true,
                "WEB_LK_INFO_HEADER_STATEMENT": "Информацию о готовности справки вы можете получить по телефону: 8 800 888 88 88",
                "WEB_LK_INFO_BODY_STATEMENT": null
            },
            "todoctor": {
                "title": null,
                "WEB_LK_TALON_PRICE_INFO": "* - Стоимость может быть другой при обращении в клинику"
            },
            "hdoctor": {
                "title": null
            },
            "payments": {
                "title": null,
                "WEB_LK_FIN": true,
                "WEB_LK_FIN_HISTORY": true,
                "WEB_LK_FIN_PAY": true,
                "WEB_LK_PAY_GO_TXT": "Сейчас вы будете перенаправлены на страницу оплаты",
                "WEB_LK_PAY_LIFETIME": 70
            },
            "services": {
                "title": null,
                "WEB_LK_SERVICES_INFO": "Обратитесь в регистратуру. <br><h1>Тел. 8 800 555 666</h1>"
            },
            "maps": {
                "title": null,
                "allGPS_COORDINATES": "<iframe src='https://yandex.ru/map-widget/v1/?um=constructor%3Ac86a490832a08362f58f04ded15880ae72ceb1ef9af50ed68fe84c6b2c31f3ac&amp;source=constructor' width='500' height='400' frameborder='0'></iframe>"
            },
            "recovery": {
                "title": null,
                "WEB_LK_RECOVERY_TO_EMAIL": true
            }
        },
        "currency": [
            {
                "code": "1",
                "symbol": " ₽"
            },
            {
                "code": "2",
                "symbol": " ₸"
            }
        ]
    };
// console.log('global.app_config=', global.app_config);
    const response = {
        success: true,
        data: global.app_config,
        msg: null
    }

    res.json(response);

});

/**
 * @api {get} /api/captcha.png Капча
 * @apiGroup api
 * @apiVersion 0.0.1
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */
app.get("/api/captcha.png", function(req,res) {
//    console.log('CAPCHA query=', req.query);
//    console.log('CAPCHA query1=', req.query.solid);
    let num = Math.trunc(Math.random()*9000+1000);
    captcha.add(num, req.query.solid);
    var p = new captchapng(140,40,parseInt(num)); // width,height,numeric captcha
    p.color(0, 0, 0, 0);  // First color: background (red, green, blue, alpha)
//    p.color(88, 206, 255, 90);  // First color: background (red, green, blue, alpha)
    p.color(80, 80, 80, 255); // Second color: paint (red, green, blue, alpha)

    var img = p.getBase64();
//    var imgbase64 = new Buffer(img,'base64');
    var imgbase64 = Buffer.from(img,'base64');
    res.writeHead(200, {
        'Content-Type': 'image/png'
    });
    res.end(imgbase64);
});




/**
 * @api {post} /api/changepw Смена пароля (TOKEN)
 * @apiGroup api
 * @apiVersion 0.0.1
 *
 * @apiParam {String} oldPassword='' - страрый пароль
 * @apiParam {String} newPassword='' - новый пароль
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */

app.post("/api/changepw", global.acsToken, function(req,res) {
    let user = global.getAuthUser(req);
    let params = {p_patient_id: user.patient_id, p_old_pwd: null, p_new_pwd: null};

    if (req.body && req.body.oldPassword && req.body.newPassword) {
        params.p_old_pwd = req.body.oldPassword;
        params.p_new_pwd = req.body.newPassword;

        execute.executeRes(sql_change_password, params)
            .then(result => {
                let r = format.assocArrayFromJSON(result);
                res.json(format.getFormatRes(true, r, null));
                if (r && r[0] && r[0].err_code && r[0].err_code >0){
                    global.LogUrl(req, 0);
                } else {
                    global.LogUrl(req, 1);
                }
            })
            .catch(err => {
                res.json(format.getFormatRes(false, null, err));
                global.LogUrl(req, 0);
            });
    } else {
        res.json(format.getFormatRes(false, null, 'Not params'));
    }
});


function get_send_email_change_password(patientID) {
    let params = {p_patient_id: patientID};
    return  exeBd(sql_send_email_change_password, params)
}

/**
 * @api {post} /api/findpatientchangepw Восстановление пароля
 * @apiGroup api
 * @apiVersion 0.0.1
 *
 * @apiParam {String} lastName='' - фамилия
 * @apiParam {String} firstName='' - имя
 * @apiParam {String} secondName='' - отчество
 * @apiParam {String} birthDate='' - дата рождения в формате dd_MM_yyyy
 * @apiParam {String} email='' - электронная почта
 * @apiParam {String} captcha='' - капча
 * @apiParam {String} captchaSolid='' - капча соль
 *
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */

app.post("/api/findpatientchangepw", function(req,res) {
    let params = {p_lastname: null, p_firstname: null, p_secondname: null,  p_birthdate: null, p_email: null};

    if (req.body
        && req.body.lastName
        && req.body.firstName
        && req.body.secondName
        && req.body.birthDate
        && req.body.email
        && req.body.captcha
        && req.body.captchaSolid
                        ) {
        logger.info('req.body=' + JSON.stringify(req.body));
/*
 logger.info('req.body=' + JSON.stringify(req.body));

 if (req.body && req.body.captcha && req.body.captchaSolid) {
        let c = captcha.get(req.body.captchaSolid);   // Ищем КАПЧУ
console.log('CCC=', c);
console.log('req.body.captcha=', req.body.captcha);
        if (c && c>10 && c == req.body.captcha) {
            captcha.get(req.body.captcha);  // удаляем капчу из списка

 */
// Проверка Капчи
        let c = captcha.get(req.body.captchaSolid);   // Ищем КАПЧУ
        console.log('CCC=', c);
        console.log('req.body.captcha=', req.body.captcha);
        if (c && c>10 && c == req.body.captcha) {
            captcha.get(req.body.captcha);  // удаляем капчу из списка
            params.p_lastname = req.body.lastName;
            params.p_firstname = req.body.firstName;
            params.p_secondname = req.body.secondName;
            params.p_birthdate = req.body.birthDate;
            params.p_email = req.body.email;

            execute.executeRes(sql_find_patient_change_password, params)
                .then(result => {
                    console.log('result=', result);
                    let r = format.assocArrayFromJSON(result);
console.log('R=', r);
                    if (r[0].identity){
                        const patientId = r[0].identity;
                        get_send_email_change_password(patientId)
                            .then(resMail => {
/*
console.log('resMail=', resMail);
console.log('resMail[0].ERROR_CODE=', resMail[0].ERROR_CODE);
                                if (resMail && resMail[0]) {
                                    console.log('test1');
                                }
                                if (resMail[0].ERROR_CODE) {
                                    console.log('test2');
                                }
                                if (resMail[0].ERROR_CODE == 0) {
                                    console.log('test3');
                                }


*/

                                if (resMail && resMail[0] && resMail[0].ERROR_CODE == 0) {
                                    res.json(format.getFormatRes(true, {identity: patientId}, null));
                                    global.LogUrl(req, 1, patientId);
                                } else {
                                    res.json(format.getFormatRes(false, format.assocArrayFromJSON(resMail), null));
                                    global.LogUrl(req, 1, patientId);
                                }
                            })
                            .catch(ereMail => {
                                res.json(format.getFormatRes(false, null, ereMail));
                                global.LogUrl(req, 0, patientId);
                            })
                    } else {
                        res.json(format.getFormatRes(false, r, null));
                    }
//                get_send_email_change_password
                })
                .catch(err => {
                    console.error('SQL Err=', err);
                    res.json(format.getFormatRes(false, null, err));
                });
        } else {
            res.json(format.getFormatRes(false, null, 'капча не верна'));
        }
    } else {
        res.json(format.getFormatRes(false, null, 'Not params'));
    }
});

/**
 * @api {post} /api/checktr Проверка токена
 * @apiGroup api
 * @apiVersion 0.0.1
 *
 * @apiParam {String} token='' - токен
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */

app.post("/api/checktr", function(req,res) {
    let params = {p_token: null};

    if (req.body && req.body.token) {
        params.p_token = req.body.token;

        execute.executeRes(sql_check_token_recovery, params)
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

// const sql_change_password_by_token = "BEGIN "+cfg.db.packageName+".change_password_by_token(:p_token, :p_new_pwd, :cursor); END;";
/**
 * @api {post} /api/changepwtoken Смена пароля
 * @apiGroup api
 * @apiVersion 0.0.1
 *
 * @apiParam {String} token='' - токен
 * @apiParam {String} newpw='' - Новый пароль
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */

app.post("/api/changepwtoken", function(req,res) {
    let params = {p_token: null, p_new_pwd: null};

    if (req.body && req.body.token && req.body.newpw) {
        params.p_token = req.body.token;
        params.p_new_pwd = req.body.newpw;

        execute.executeRes(sql_change_password_by_token, params)
            .then(result => {
                let r = format.assocArrayFromJSON(result);
                res.json(format.getFormatRes(true, r, null));
                if (r && r[0] && r[0].patientid){
                    global.LogUrl(req, 1, r[0].patientid);
                }
            })
            .catch(err => {
                res.json(format.getFormatRes(false, null, err));
            });
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

/* Список сессий */
/*
app.get("/api/session", function(req,res) {
    res.json(format.getFormatRes(true, global.session.getAll(), null));
});
*/

/**
 * @api {post} /api/patientforphone Поиск пациента по телефону
 * @apiGroup api
 * @apiVersion 0.0.1
 *
 * @apiParam {String} phone - телефон
 * @apiParam {String} captcha - код капчи
 * @apiParam {String} captchaSolid - код2 капчи
 *
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */
app.post("/api/patientforphone", function(req,res) {
    let params = {p_phone: null};
//    console.log('TEST req.body=', req.body);

    logger.info('req.body=' + JSON.stringify(req.body));

    if (req.body && req.body.captcha && req.body.captchaSolid && req.body.phone) {
//        console.log('TEST req.body.phone.length=', req.body.phone.length);
//    if (req.body && req.body.captcha && req.body.captchaSolid && req.body.phone
//        && (req.body.phone.length>=2 && req.body.phone.length<15) ) {
        let c = captcha.get(req.body.captchaSolid);   // Ищем КАПЧУ
//        console.log('CCC=', c);
//        console.log('req.body.captcha=', req.body.captcha);
        if (c && c>10 && c == req.body.captcha) {
//            captcha.get(req.body.captcha);  // удаляем капчу из списка
            params.p_phone = req.body.phone;
            execute.executeRes(sql_get_patient_for_phone, params)
                .then(result => {
                    const tmp = format.assocArrayFromJSON(result);
                    res.json(format.getFormatRes(true, tmp, null));
                })
                .catch(err => {
                    res.json(format.getFormatRes(false, null, err));
                });
        } else {
            res.json(format.getFormatRes(false, null, 'CaptchaError'));
        }
    } else {
        res.json(format.getFormatRes(false, null, 'Not params'));
    }

});

/**
 * @api {post} /api/loginphone Авторизация по телефону
 * @apiGroup api
 * @apiVersion 0.0.1
 *
 * @apiParam {String} patientid - код пациента
 * @apiParam {String} captcha - код капчи
 * @apiParam {String} captchaSolid - код2 капчи
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */
app.post("/api/loginphone", function(req,res) {
    // 1) Проверка по капче
    if (req.body && req.body.captcha && req.body.captchaSolid && req.body.patientid) {
console.log('req.body=', req.body);
        let c = captcha.get(req.body.captchaSolid);   // Ищем КАПЧУ
        if (c && c > 10 && c == req.body.captcha) {
            logger.info('CAPTCHA - OK');
//            captcha.get(req.body.captcha);  // получаем капчу из списка
            // 2) Проверка по пациенту
            execute.executeRes(sql_patient_info, {p_patient_id: req.body.patientid})
                .then(result => {
console.log('TEST INFO result=', result);
                    if (result.length > 0) { // Норм, пациент найден
                        const user = {patient_id: req.body.patientid, solid: cfg.token.solid_text};
                        /!*  генерим токен *!/
                        const token = jwt.sign(user, cfg.token.JWT_SECRET, {
                            expiresIn: cfg.token.lifetime
                        })

                        // Создаем сессию
                        let s = global.session.add(token, req.body.patientid, req);

                        // Склеиваем данные
                        let r = Object.assign({token: token}, {patientId: req.body.patientid});
// Получаем доп параметры относитель пациента
                        getPatientEXT(req.body.patientid)
                            .then(resExt => {
                                r = Object.assign(r, {ext: resExt});
                                res.json(format.getFormatRes(true, r, null));
                                global.LogUrl(req, 1, req.body.patientid, s);
                            })
                            .catch(errExt => {
                                r = Object.assign(r, {ext: []});
                                res.json(format.getFormatRes(true, r, null));
                                global.LogUrl(req, 1, tmp.PATIENT_ID, s);
                            });
                    } else {
                        logger.info('login phone ERR=' + JSON.stringify(req.body));
                        global.LogUrl(req, 0);
                    }
                })
                .catch(err => {
                        res.json(format.getFormatRes(false, null, err));
                });
        } else {
            logger.info('CAPTCHA - NOT VALID');
            res.json(format.getFormatRes(false, null, 'Not AUTH'));
        }

    } else {
        res.json(format.getFormatRes(false, null, 'Not AUTH'));
    }
});

/**
 * @api {get} /api/family Данные о родстве (TOKEN)
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
app.get("/api/family",global.acsToken, function(req,res) {
    let user = global.getAuthUser(req);
    execute.executeRes(sql_get_family, {patient: user.patient_id})
        .then(result => {
            const tmp = format.assocArrayFromJSON(result);
            let promiseEXTS = [];
            tmp.forEach(item => {
                promiseEXTS.push(getPatientEXT(item.prel_ptientid));
            });
            Promise.all(promiseEXTS)  // Список вопросов по протоколу
                .then(resExtS => {
//                        console.log('R=', r);
                    result.forEach((item, index) => {
                        const PATIENT_ID = tmp[index].prel_ptientid;
                        const user = { patient_id: PATIENT_ID, solid: cfg.token.solid_text};
                        /!*  генерим токен *!/
                        const token = jwt.sign(user, cfg.token.JWT_SECRET, {
                            expiresIn: cfg.token.lifetime
                        })
                        if (resExtS[index]) {
                            tmp[index] = Object.assign(tmp[index], {token: token, ext: resExtS[index]});
                        }
                    });
                    res.json(format.getFormatRes(true, tmp, null));
                })
                .catch(er => {
                    console.error('ER=', er);
                    res.json(format.getFormatRes(false, null, er));
                });
        })
        .catch(err => {
            res.json(format.getFormatRes(false, null, err));
        });
});

module.exports = app;

