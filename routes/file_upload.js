const express = require('express');
const execute =  require('../utils/execute');
var fileUpload = require('express-fileupload');
const app = express();
const logger = require('../utils/logger')('file-upload');
const cfg = require('../config');
const fs = require('fs');
const sb = require('../utils/streamBuffer');
const format = require("../utils/format");
const moment = require('moment');
const folderTMP = 'tempmail';

app.use(fileUpload({}));

const sql_document_add = "BEGIN "+cfg.db.packageName+".document_add(:p_patient_id, :p_file_name, :p_doc_type_id, :blob, :cursor); END;";
const sql_get_list_types_document = "BEGIN "+cfg.db.packageName+".get_list_types_document(:cursor); END;";
const sql_get_documents = "BEGIN "+cfg.db.packageName+".get_documents(:p_patient_id, :cursor); END;";
const sql_get_doc_blob = "BEGIN "+cfg.db.packageName+".get_doc_blob(:p_patient_id, :p_doc_id, :p_file_name, :cursor); END;";
const sql_document_add_trueconf = "BEGIN "+cfg.db.packageName+".document_add_trueconf(:p_patient_id, :p_file_name, :p_link_id, :blob, :cursor); END;";
const sql_get_document_for_rnumb = "BEGIN "+cfg.db.packageName+".get_document_for_rnumb(:p_patient_id, :p_rnumb_id, :cursor); END;";

// Получить рабочий каталог
function getDir() {
    // TODO: проверить на Linux
    let path = process.cwd();
    return path + '/';
}

app.post('/file_upload/upload',global.acsToken , function(req, res) {
//    logger.info('req.files=' + JSON.stringify(req.files));
    let user = global.getAuthUser(req);

    if (req.files && req.files.file && req.files.file.data && req.body.type_doc){
        let byte = req.files.file.data;
        let params = {p_patient_id: user.patient_id , p_file_name: req.files.file.name, p_doc_type_id: req.body.type_doc, blob: byte};
        execute.executeRes(sql_document_add, params)
            .then(result => {
                const tmp = format.assocArrayFromJSON(result);
                res.json(format.getFormatRes(true, tmp[0], null));
            })
            .catch(err => {
                res.json(format.getFormatRes(false, null, err));
            });
    } else {
        res.json(format.getFormatRes(false, null, 'Not params'));
    };
});

app.post('/file_upload/upload_tc',global.acsToken , function(req, res) {
    logger.info('req.files=' + JSON.stringify(req.files));
    let user = global.getAuthUser(req);

    if (req.files && req.files.file && req.files.file.data && req.body.link_id){
        let byte = req.files.file.data;
        let params = {p_patient_id: user.patient_id , p_file_name: req.files.file.name, p_link_id: req.body.link_id, blob: byte};
        execute.executeRes(sql_document_add_trueconf, params)
            .then(result => {
                const tmp = format.assocArrayFromJSON(result);
                res.json(format.getFormatRes(true, tmp[0], null));
            })
            .catch(err => {
                res.json(format.getFormatRes(false, null, err));
            });
    } else {
        res.json(format.getFormatRes(false, null, 'Not params'));
    };
});

app.get("/file_upload/list_type",global.acsToken, function(req,res) {
//    let user = global.getAuthUser(req);
    execute.executeRes(sql_get_list_types_document, {})
        .then(result => {
            const tmp = format.assocArrayFromJSON(result);
            res.json(format.getFormatRes(true, tmp, null));
        })
        .catch(err => {
            res.json(format.getFormatRes(false, null, err));
        });
});

app.get("/file_upload/list_doc",global.acsToken, function(req,res) {
    let user = global.getAuthUser(req);
    execute.executeRes(sql_get_documents, {p_patient_id: user.patient_id})
        .then(result => {
            const tmp = format.assocArrayFromJSON(result);
            res.json(format.getFormatRes(true, tmp, null));
        })
        .catch(err => {
            res.json(format.getFormatRes(false, null, err));
        });
});

app.get("/file_upload/img/:patientId/:docId/:name_file", function(req,res) {
    function err_img(r){
        r.setHeader('content-type', 'text/html;charset=utf-8');
        r.write('<H1>нет такого файла</H1>');
        r.end();
    };

    if (req && req.params && req.params.patientId && req.params.docId && req.params.name_file) {
        // Получаем картинку
        let params = {p_patient_id: null, p_doc_id: null, p_file_name: ''};
        params.p_patient_id = req.params.patientId;
        params.p_doc_id = req.params.docId;
        params.p_file_name = req.params.name_file;
        execute.executeRes(sql_get_doc_blob, params)
            .then(result => {
                if (result && result[0] && result[0].BYTES){
                    res.end(result[0].BYTES);
                    logger.info(`OUT img file ${params.p_file_name}, patient: ${params.p_patient_id}`)
                } else {
//                    console.error('err BYTE=');
                    logger.error(`OUT BYTE img file ${params.p_file_name}, patient: ${params.p_patient_id}`)
                    err_img(res);
                }
            })
            .catch(err => {
                logger.error(`OUT img file ${params.p_file_name}, patient: ${params.p_patient_id} ERR:${err}`)
//                console.error('err=', err);
                err_img(res);
            });

    } else {
        logger.error(`OUT img file ${params.p_file_name}, patient: ${params.p_patient_id} NOT params.`)
        err_img(res);
    }

});


app.post('/file_upload/temp',global.acsToken , function(req, res) {
    logger.info('uoload file=' + JSON.stringify(req.files.file.name));
    let user = global.getAuthUser(req);
    let pathTMP = getDir() + folderTMP + '/';
    if (req.files && req.files.file && req.files.file.data){
        let byte = req.files.file.data;
        moment.locale('ru');
        let dt = moment().format('YYYYDDMMHHmmss_SSS');
        let name_file_tmp = user.patient_id + dt + req.files.file.name;
        const pathFile = pathTMP + name_file_tmp;
        var outStream = fs.createWriteStream(pathFile);
        outStream.on('error', function(err) { console.error(err);});
        sb.bufferToStream(byte).pipe(outStream);
        outStream.on('on', function(ress) { console.log('r=',ress);});

        res.json({success: true, data: name_file_tmp, msg: null});
    } else {
        res.json(format.getFormatRes(false, null, 'Not params'));
    };

});

app.get("/file_upload/list_doc_rnumb/:r_numbId",global.acsToken, function(req,res) {
    let user = global.getAuthUser(req);
    if (req && req.params && req.params.r_numbId) {
        execute.executeRes(sql_get_document_for_rnumb, {p_patient_id: user.patient_id, p_rnumb_id: req.params.r_numbId})
            .then(result => {
                const tmp = format.assocArrayFromJSON(result);
                res.json(format.getFormatRes(true, tmp, null));
            })
            .catch(err => {
                res.json(format.getFormatRes(false, null, err));
            });
    } else {
        res.json(format.getFormatRes(false, null, 'Not params'));

    }
});

module.exports = app;

