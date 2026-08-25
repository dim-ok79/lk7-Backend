const rp = require('request-promise');
const logger = require('../utils/logger')('util-sberPay');

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0'; // разрешаем не проверенные SSL сертификаты
const _include_headers = function(body, response, resolveWithFullResponse) {
    return {'headers': response.headers, 'data': body};
};

class SberPayService {
    enable = false; // Состояние
    config = {};
    lHeaders = {
        'Content-Type': 'application/json',
    };

    constructor(cfg) {
        logger.info(`SberPayService loading: ${JSON.stringify(cfg)}`);
        // Проверка на параметры
//        if (cfg.host && cfg.host.length>9){
        if (cfg.server && cfg.server.length>9){
          this.enable = true;
          this.config = cfg;
        } else {
            logger.error('Нет параметра (host) в файле настроек');
        }
        logger.info(`TEST getOptions: ${JSON.stringify(this.getOptions({},'test'))}`);

    }


    getOptions(p_params, p_url ) {
        logger.info('START getOptions=');
        return  {
            method: 'POST',
            uri: `${this.config.host}${p_url}`,
            headers: this.lHeaders,
            body: p_params,
            json: true,
            rejectUnauthorized: false, // Отключаем проверку сертификата
            resolveWithFullResponse: true
        }
    }

    getPaySystem() {
        return new Promise((resolve, reject) => {
            const p_url = '/paysystem';
            const options = {
                method: 'GET',
                uri: `${this.config.server}${p_url}`,
                headers: this.lHeaders,
                json: true,
            }
            rp(options)
                .then((resp) => {
                    resolve(resp);
                })
                .catch((err) => {
                    logger.error('ERR=', err);
                    reject(err);
                })
        })
    };


    createPayServ(p_url, p_orderNum, p_amount, p_returnUrl,  p_email, p_expirationDate, p_srv_info, p_patient_num) {
        return new Promise((resolve, reject) => {
            const options = {
                method: 'POST',
                uri: `${this.config.server}${p_url}`,
                headers: this.lHeaders,
                body: {
                    orderNumber: p_orderNum + '-' + p_patient_num ,
                    amount: p_amount,
                    returnUrl: p_returnUrl,
                    email: p_email,
                    expirationDate: p_expirationDate,
                    srv_info: p_srv_info
                },
                json: true,
            }
console.log('options=', options);
            rp(options)
                .then((resp) => {
                    logger.info('GET resp=' + JSON.stringify(resp));
                    logger.info('GET resp.data=' + JSON.stringify(resp.data));
/*
результат : confirmationurl: resp.body.formUrl, paimentid
ИЛИ все из body

GET data.data={
"orderId":"208aea1c-1fa5-5913-1a73-11fbbec53f5b",
"formUrl":"https://ift.payecom.ru/pay_ru?orderId=208aea1c-1fa5-5913-1a73-11fbbec53f5b",
"errorCode":"0","errorMessage":"Обработка запроса прошла без системных ошибок",
"externalParams":{"sbolDeepLink":"sberpay://invoicing/v2?bankInvoiceId=208aea1c1fa559131a7311fbbec53f5b&operationType=Web2App"}}

 */
                    resolve(resp.data);

                })
                .catch((err) => {
                    logger.error('ERR=', err);
                    reject(err);
                })

        });

    }

    getPayInfo(p_orderid){
        return new Promise((resolve, reject) => {
            const p_url = '/getPayInfo/' + p_orderid;
            const options = {
                method: 'GET',
                uri: `${this.config.server}${p_url}`,
                headers: this.lHeaders,
                json: true,
            }
            rp(options)
                .then((resp) => {
                    resolve(resp);
                })
                .catch((err) => {
                    logger.error('ERR=', err);
                    reject(err);
                })
        })
    }

    createPaySBP(p_orderNum, p_amount, p_returnUrl) {
        return new Promise((resolve, reject) => {
            logger.info(p_returnUrl)
            const params = {
                "userName": this.config.userName,
                "password": this.config.password,
                "orderNumber": p_orderNum,
                "amount": p_amount,
                "returnUrl": p_returnUrl,
                "features": "FORCE_SSL",
                "jsonParams": {
                    "qrType": "DYNAMIC_QR_SBP",
                    "sbp.scenario": "C2B"
                }
            };
            logger.info('GET createPaySBP OPTIONS=' + JSON.stringify(this.getOptions(params, 'register.do')));
            rp(this.getOptions(params, 'register.do'))
                .then((resp) => {
                    logger.info('GET SBP data.body=' + JSON.stringify(resp.body));
                    resolve(resp.body);
                })
                .catch((err) => {
                    logger.error('ERR=', err);
                    reject(err);
                })

        });

        /* Результат :
        formUrl - ссылка на оплату
        {"errorCode":"0",
        "externalParams":{"sbolDeepLink":"sberpay://invoicing/v2?bankInvoiceId=ce91cb833cd2450d941a3320f99add30&operationType=Web2App"},
        "orderId":"ce91cb83-3cd2-450d-941a-3320f99add30","formUrl":"https://sbox.payecom.ru/pay_ru?orderId=ce91cb83-3cd2-450d-941a-3320f99add30","errorMessage":"Обработка запроса прошла без системных ошибок"}
         */
    }

    createPay(p_orderNum, p_amount, p_returnUrl) {
        return new Promise((resolve, reject) => {
            logger.info(p_returnUrl)
            const params = {
                "userName": this.config.userName,
                "password": this.config.password,
                "orderNumber": p_orderNum,
                "amount": p_amount,
                "returnUrl": p_returnUrl,
                "features": "FORCE_SSL",
            };
            let str =this.getOptions(params, 'register.do');
            logger.info('GET createPay str=' + JSON.stringify(str));
            rp(str)
                .then((resp) => {
                    logger.info('GET data.body=' + JSON.stringify(resp.body));
                    resolve(resp.body);
                })
                .catch((err) => {
                    logger.error('ERR=', err);
                    reject(err);
                })

        });
        /* Результат :
        formUrl - ссылка на оплату
        {"errorCode":"0",
        "externalParams":{"sbolDeepLink":"sberpay://invoicing/v2?bankInvoiceId=ce91cb833cd2450d941a3320f99add30&operationType=Web2App"},
        "orderId":"ce91cb83-3cd2-450d-941a-3320f99add30","formUrl":"https://sbox.payecom.ru/pay_ru?orderId=ce91cb83-3cd2-450d-941a-3320f99add30","errorMessage":"Обработка запроса прошла без системных ошибок"}
         */
    }

    atolFFDStatus(p_ffd_id){
        return new Promise((resolve, reject) => {
            const options = {
                method: 'GET',
                uri: `${this.config.server}/atol/status/${p_ffd_id}`,
                headers: this.lHeaders,
                json: true,
            }
            logger.info('/atol/status options=' + JSON.stringify(options));
            rp(options)
                .then((resp) => {
                    logger.info('GET resp=' + JSON.stringify(resp));
                    if (resp && resp.success == true && resp.data){
                        resolve(resp.data);
                    } else {
                        reject(resp);
                    }
                })
                .catch((err) => {
                    logger.error('ERR=', err);
                    reject(err);
                })
        });
    }

    atolFFD(p_orderNum, p_amount, p_email, p_dateCreate, p_srv_info, p_patient_num, p_avans){
        logger.info('atolFFD p_orderNum=' + p_orderNum);
        logger.info('atolFFD p_amount=' + p_amount);
        logger.info('atolFFD p_email=' + p_email);
        logger.info('atolFFD p_dateCreate=' + p_dateCreate);
        logger.info('atolFFD p_srv_info=' + p_srv_info);
        logger.info('atolFFD p_avans=' + p_avans);
        return new Promise((resolve, reject) => {
/*
TODO: залипуха на номер - подмена
+ 44636-781982
+ 46653-385021 (11-08-26)
 */
            let _orderNumber = p_orderNum + '-' + p_patient_num ;
            if (_orderNumber == '44636-781982') {
                _orderNumber = '44636-781982_1'
            }
                const options = {
                    method: 'POST',
                    uri: `${this.config.server}/atol/ffd`,
                    headers: this.lHeaders,
                    body: {
                        orderNumber: _orderNumber,
                        amount: p_amount,
                        email: p_email,
                        dateCreate : p_dateCreate,
                        srv_info: p_srv_info,
                        avans: p_avans
                    },
                    json: true,
                }
                logger.info('/atol/fdd options=' + JSON.stringify(options));
                rp(options)
                    .then((resp) => {
                        logger.info('GET resp=' + JSON.stringify(resp));
                        logger.info('GET resp.data=' + JSON.stringify(resp.data));
                        if (resp && resp.success == true){
                            resolve(resp.data);
                        } else {
                            reject(resp);
                        }
                    })
                    .catch((err) => {
                        logger.error('ERR=', err);
                        reject(err);
                    })

            });

    }
};

module.exports = SberPayService;

/*
module.exports = SberPayService;

TEST
TOKEN eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXRpZW50X2lkIjoxMTgyNTgxLCJzb2xpZCI6InFwZGFzZmxzZGxrMzQ1MGQsIiwiaWF0IjoxNzI1NjA1MzY1LCJleHAiOjE3MjU2MjY5NjV9.ApFk3_49wZ5EtjDK9UNGUiFFWkGcdo3woIOdHsmkar8

http://127.0.0.1:4005/pay/order

"token": "" +
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXRpZW50X2lkIjoxMTgyNTgxLCJzb2xpZCI6InFwZGFzZmxzZGxrMzQ1MGQsIiwiaWF0IjoxNzI1NjA1NDI4LCJleHAiOjE3MjU2MjcwMjh9.414aiWdPXbmnk_rP1K5Ylj7Lpu-qWKldgrsfvis_kIk
    "patientid": 1182581,
*/
