const express = require('express');
const jwt = require('jsonwebtoken');
const cfg = require('../config');
const format = require("../utils/format");
const app = express();
const logger = require('../utils/logger')('R-Index');

// const c_img = require("../utils/img");

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


app.use('/img/spec', express.static('static/spec')); // для фотки специальностей (http://10.0.0.204:2018/photo/user1.jpg)
app.use('/img/doc', express.static('static/doc')); // для фотки докторов (http://10.0.0.204:2018/photo/user1.jpg)
app.use('/js', express.static('static/js')); // для js

// console.log('app=', app);
module.exports = app;

