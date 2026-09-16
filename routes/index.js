const express = require('express');
const jwt = require('jsonwebtoken');
const cfg = require('../config');
const format = require("../utils/format");
// const loadModuleApp = require("../utils/util");
const tmptoken = require('../utils/tmptoken');
let TmpTokenArray = new tmptoken(10); // Время жизни 10 секеунд


const app = express();
const logger = require('../utils/logger')('R-Index');

const cookieParser = require('cookie-parser');

app.use(cookieParser());

/* Проверка по токену , параметр GET tmptoken*/

global.acsTmpToken = function(req, res, next) {
    logger.info(`acsTmpToken req.url= ${JSON.stringify(req.url)}`);
    logger.info(`acsTmpToken req.param tmptoken= ${req.params['tmptoken']}`);

    if (req.params['tmptoken']) {
        req.params['tmptoken']
        let tmpToken = TmpTokenArray.getValue(req.params['tmptoken']);
        if (tmpToken && tmpToken.value && tmpToken.value.token){
            let token = tmpToken.value.token;
            logger.info(`token= ${token}`);

            decoded = jwt.verify(token, cfg.token.JWT_SECRET, (err, dec) => {
                if (err) {
                    logger.info(`acc: token err headers= ${JSON.stringify(req.headers)}`);
                    if (err.name) {
                        console.error('token err =', err.name);
                        logger.error(`token err= ${JSON.stringify(err.name)}`);

                    } else {
                        logger.error(`token err= ${JSON.stringify(err)}`);
                    }
//                next();
                    res.status(401).json(format.getFormatRes(false,null, 'No access'));

                } else {
                    logger.info(`acc token OK= ${JSON.stringify(dec)}`);
                    next();
                }
            });

        } else {
            logger.info(`acc token ERR, NOT find tmpToken= ${JSON.stringify(tmpToken)}`);
            res.status(401).json(format.getFormatRes(false,null, 'No access'));
        }

    } else {
        logger.info(`acc: No access headers= ${JSON.stringify(req.headers)}`);
        res.status(401).json(format.getFormatRes(false,null, 'No access'));
    }
};


// Логирование сессий
global.getAuthUser = function(req) {
    if (req.headers.authorization){
        return jwt.decode(req.headers.authorization.split(' ')[1]);
    } else {
        return null;
    }
}

/* Проверка по токену*/
global.acsToken = function(req, res, next) {
    logger.info(`acsToken req.url= ${JSON.stringify(req.url)}`);
    if (req.headers.authorization) {
        let token = req.headers.authorization.split(' ')[1];
        logger.info(`token= ${token}`);

        decoded = jwt.verify(token, cfg.token.JWT_SECRET, (err, dec) => {
            if (err) {
                logger.info(`acc: token err headers= ${JSON.stringify(req.headers)}`);
                if (err.name) {
                    console.error('token err =', err.name);
                    logger.error(`token err= ${JSON.stringify(err.name)}`);

                } else {
                    logger.error(`token err= ${JSON.stringify(err)}`);
                }
//                next();
                res.status(401).json(format.getFormatRes(false,null, 'No access'));

            } else {
                logger.info(`acc token OK= ${JSON.stringify(dec)}`);
                next();
            }
        });

    } else {
        logger.info(`acc: No access headers= ${JSON.stringify(req.headers)}`);
        res.status(401).json(format.getFormatRes(false,null, 'No access'));
    }
};

/* Проверка по токену*/
global.acsTokenPOSTReport = function(req, res, next) {
    logger.info(`acsTokenPOSTReport req.url= ${JSON.stringify(req.url)}`);
    if (req.body.token && req.params.patient_id) {
        let token = req.body.token;
        logger.info(`token= ${token}`);

        decoded = jwt.verify(token, cfg.token.JWT_SECRET, (err, dec) => {
            if (err) {
                logger.info(`acc: token err headers= ${JSON.stringify(req.headers)}`);
                if (err.name) {
                    console.error('token err =', err.name);
                    logger.error(`token err= ${JSON.stringify(err.name)}`);

                } else {
                    logger.error(`token err= ${JSON.stringify(err)}`);
                }
//                next();
                res.status(401).json(format.getFormatRes(false,null, 'No access'));

            } else {
                logger.info(`acc token OK= ${JSON.stringify(dec)}`);
                if (req.params.patient_id == dec.patient_id) {
                    next();
                } else {
                    res.status(401).json(format.getFormatRes(false,null, 'No access2'));
                }

            }
        });

    } else {
        logger.info(`acc: No access headers= ${JSON.stringify(req.headers)}`);
        res.status(401).json(format.getFormatRes(false,null, 'No access'));
    }
};

app.get('/', function (req, res) {
    res.status(404).json({Err:"Not API"});
});

app.use(require('./loger_url'));      // логирование запросов
app.use(require('./api'));            // Общая информация
app.use(require('./lpu'));            // ЛПУ
app.use(require('./contract'));       // Договора на подписание
app.use(require('./patient'));        // Информация о пациенте
app.use(require('./log'));            // Информация о пациенте (входы пациента)

app.use(require('./history'));        // Записи пациента
app.use(require('./rnumb'));          // Номерки пациента
app.use(require('./record'));         // Запись на номерки
app.use(require('./payments'));       // Платежи пациента
/*try {*/
app.use(require('./payServSber'));    // Платежный сервис Cber
/*
}
catch (e) {
  console.log('E=', e)
}
*/
app.use(require('./action'));          // Акции

app.use(require('./semd'));            // СЭМДы

app.use(require('./labs'));            // Лаб анализы

/*  временные ID вместо токена */
app.get('/auth/id', global.acsToken, function (req, res) {
    try {
        let tmp_token = req.headers.authorization.split(' ')[1];
        let tmp_id = TmpTokenArray.tmpTokenGenerateId();
        TmpTokenArray.add({token: tmp_token, id: tmp_id})
//        console.log('TEST 4 list =', TmpTokenArray.getValues());
        res.json(format.getFormatRes(true, {id: tmp_id}, null));
    } catch (err) {
        logger.error('Ошибка tmpTokenID='+ JSON.stringify(err));
        res.json(format.getFormatRes(false, null, 'Ошибка создания ID'+ JSON.stringify(err)));
    }
});


app.use('/img/spec', express.static('static/spec')); // для фотки специальностей (http://10.0.0.204:2018/photo/user1.jpg)
app.use('/img/doc', express.static('static/doc')); // для фотки докторов (http://10.0.0.204:2018/photo/user1.jpg)
app.use('/js', express.static('static/js')); // для js

// Обработка 404 ошибки для всех остальных URL
app.use((req, res, next) => {
    res.status(404).json({
        error: 'Ignore API'
    });
});



module.exports = app;

