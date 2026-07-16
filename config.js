var conf = {};

/*
 * port номер порта на котором висит модуль
 * host ip адрес машины
 * https - Подключение SSL сертификата
 *  file_certificate - файл сертификата
 *  file_privateKey - Приватный ключ
 *  passphrase - Пароль к ключу
 */
conf.server = {
    port: 4005,        
    host: '127.0.0.1',
    https0 : {
        file_certificate: 'ssl/bar/cert.pem',
        file_privateKey: 'ssl/bar/privkey.pem',
        passphrase: null
    },
    cors1: ['http://10.0.0.204:4226']
};

/*
 *  Настройки подключения к БД
 * параметр libDir = E:\\WEB (WIN) /  /var/www/ (LINUX)
 * cursorCountRec - количество записей для выборки в курсоре (стоит уменьшать если не хватает памяти)
 *  - Иногда вызывает переполнение, нужно поменять на значение = 100 (не хватка памяти)
 */
conf.db = {
    port: 1521,
    host: "172.16.1.9",
    servername: "MED",
    username: "solution_med",
    packageName: "solution_med.pkg_web_account_unique_7",
    userpass: "elsoft",
    libDir: "C:/NEW-LK/DRV",
    callTimeout: 120,
    cursorCountRec: 9999
}

/* секретный ключ для токена
    JWT_SECRET - ключ шифрования
    lifetime - время жизни в минутах
*/
conf.token = {
    JWT_SECRET: '1l1k2309sdfkn323nr90fasdfkn'
    , lifetime: 60*60*6  // 60*2*2  = 4мин  (значение в секундах)
    , solid_text: 'we2;34-0dfsvokionsdf2w32iu'  // соль в токен
}

// Сервис платежей web-pay параметры (TOMCAT)
conf.webPay = {
    username : 'webpay',
    password : 'elsoft',
    host : 'http://10.0.0.204:8080/web-pay'
}

/* Для работы с ЕСИА - ГосУслуги*/
conf.webAuth = {
    username : 'test1',
    password : 'testElsoft',
    host : 'http://10.0.0.182:8080/web-auth'
}


// http://10.0.0.213:4000/api/print/pdf/labresult?user_id=441074533548

// список логирования запросов (сопоставление URL и ACTION в БД -> server_log)
// + /record/rnumb/appointment
conf.log_url_list = {
    '/api/login' : 'AUTH',
    '/record/rnumb/appointment' : 'APPOINTMENT',
    '/record/rnumb/cancel' : 'CANSELLAPPOINTMENT',
    '/api/findpatientchangepw' : 'SENDPASSTOEMAIL',
    '/api/changepw' : 'CHANGE_PWD',
    '/api/changepwtoken' : 'CHANGEPASSTOEMAIL',
    '/api/loginphone' : 'AUTHPHONE',
    '/esia/reg' : 'AUTHESIA',
    '/mails/send' : 'COMMISSION',
    '/stat' : 'STATISTIC'
}

// Параметры видео конференции
conf.trueconf = {
    enable: true,      // Видео конференция включена
    service_url: 'https://10.0.0.223',                    //
    client_id: '72278a1c065d9243831ea125672b036685512359',  // идентификатор и секретный ключ соответственно, полученные при создании приложения.
    client_secret: 'da1e947e04c830f271fe19c5a7be4c8fb265d5cc',
    tag : 'lk-node',
    job_delete_time_out: 5,     //период проверки и удаления конференций в минутах
    version_api: 'v3.5'      // Версия API
}

conf.odt = {
    path_temp : 'E:/Work/PROJECT/personal_account_node/BackEnd/tmpdoc'
}

/* Параметры проверки платежей */
conf.pay = {
    job_order_to_check_time_out: 2,     // Периуд проверки платежей на платежном шлюзе в минутах
    job_order_to_check_count_check: 7,  // Количество проверок
    job_order_to_ffd_time_out: 1,        // Периуд получения URL на фискальник на ATOL шлюзе в минутах
    file_select_pay_html: 'select-pay.html'
}

/* Параметры логов */
conf.log = {
    maxsize: 1000000,   //1000000  1 mb Максимальный размер файла (5242880 = 5MB)
    maxFiles: 3,  // Количество файлов (не работает - в будущем реализуем)
}

/* Параметры IMG */
conf.img0 = {
    prefix_doc_photo: 'main_photo',  // Наименование картинки у доктора для выгрузки
    job_start_time_h: 13, // Часы (H24)
    job_start_time_m: 0,  // Минуты
    job_interval_m: 1,  // Интервал проверки в минутах (если > 0 то параметры job_start_time_! не учитываются)
    file_max_size: 500000  // максимальный размер файла
}

/* Параметры ГосУслуг */
conf.esia = {
    proxy_in: '/web-auth/api/ac/*', //  Прокси входящий
    proxy_out: 'https://reshenie-soft.ru:5443/web-auth/api/ac', //  Прокси исходящий, параметр сервиса web_auth redirect.url.ac
}

/* Параметры SberPay */
conf.sber_pay = {
    "server": "http://localhost:5005",
    "userName": "sbertest_0997",
    "password": "Sbertest2024123456",
    "host0": "https://ecomtest.sberbank.ru/ecomm/gw/partner/api/v1/",
    "host": "https://ecomift.sberbank.ru/ecomm/gw/partner/api/v1/",
    "hostSBP": "https://ecomift.sberbank.ru/ecomm/gw/partner/api/v1/",
    "return_url": "http://localhost:4200",
    "url_select_pay": "http://81.9.108.61:4005/pay/select"
}

module.exports = conf;

