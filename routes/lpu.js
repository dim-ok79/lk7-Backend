const express = require('express');
const execute =  require('../utils/execute')
const app = express();
const format = require("../utils/format");
const cfg = require('../config');

const sql_get_lpu_list = "BEGIN "+cfg.db.packageName+".get_lpu_list(:patient, :cursor); END;";
const sql_frame2_get_spec_list = "BEGIN "+cfg.db.packageName+".frame2_get_spec_list(:cursor); END;";
const sql_frame2_get_doc_list = "BEGIN "+cfg.db.packageName+".frame2_get_doc_list(:p_spec_id, :cursor); END;";
const sql_frame2_get_doc_list_all = "BEGIN "+cfg.db.packageName+".frame2_get_doc_list_all(:cursor); END;";
const sql_frame2_get_serv_list = "BEGIN "+cfg.db.packageName+".frame2_get_serv_list(:p_doctor_id, :p_spec_id, :cursor); END;";
const sql_frame2_get_doc_url = "BEGIN "+cfg.db.packageName+".frame2_get_doc_url(:p_doctor_id, :cursor); END;";
const sql_frame2_get_rnumb_list = "BEGIN "+cfg.db.packageName+".frame2_get_rnumb_list(:p_doctor_id, :p_spec_id, :p_srv_ids, :cursor); END;";

/**
 * список услуг
 * */
function get_serv_list(specID, docID) {
    let params = {p_doctor_id: docID, p_spec_id: specID};
    return  execute.executeRes(sql_frame2_get_serv_list, params)
}

/**
 * @api {get} /lpu/list Список подразделений (TOKEN)
 * @apiGroup lpu
 * @apiVersion 0.0.1
 *
 * @apiHeader {String} Authorization Authorization: TOKEN *AUTH_TOKEN*
 *
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */

app.get("/lpu/list", global.acsToken, function(req,res) {
    let user = global.getAuthUser(req);
    execute.executeRes(sql_get_lpu_list, {patient: user.patient_id})
        .then(result => {
            let r = format.assocArrayFromJSON(result);
            res.json(format.getFormatRes(true, r, null));
        })
        .catch(err => {
            res.json(format.getFormatRes(false, null, err));
        });
});

/**
 * @api {get} /lpu/speclist Список Специальностей
 * @apiGroup lpu
 * @apiVersion 0.0.1
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */

app.get("/lpu/speclist", global.acsToken, function(req,res) {
    execute.executeRes(sql_frame2_get_spec_list, {})
        .then(result => {
            let r = format.assocArrayFromJSON(result);
            res.json(format.getFormatRes(true, r, null));
        })
        .catch(err => {
            res.json(format.getFormatRes(false, null, err));
        });
});

/**
 * @api {get} /lpu/doclist Список Докторов
 * @apiGroup lpu
 * @apiVersion 0.0.1
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */

app.get("/lpu/doclist", function(req,res) {
    if (req.query && req.query.p_spec_id) {
        let promiseServListS = [];
        let params = {p_spec_id: req.query.p_spec_id};
        execute.executeRes(sql_frame2_get_doc_list, params)
            .then(result => {
                let rDoc = format.assocArrayFromJSON(result);
                rDoc.forEach(item => {
                    promiseServListS.push(get_serv_list(params.p_spec_id, item.doctorid));
                });
                Promise.all(promiseServListS)  // Список услуг
                    .then(r => {
                        rDoc.forEach((item, index) => {
                            if (r[index]) {
                                rDoc[index].srvList = r[index];
                            }
                        });
                        res.json(format.getFormatRes(true, rDoc, null));
                    })
                    .catch(er => {
                        console.error('ER=', er);
                        res.json(format.getFormatRes(false, null, er));
                    });

            })
            .catch(err => {
                res.json(format.getFormatRes(false, null, err));
            });
    } else {
        res.json(format.getFormatRes(false, null, 'Not params'));
    }
});

app.get("/lpu/doc-list-all", function(req,res) {
    execute.executeRes(sql_frame2_get_doc_list_all, {})
        .then(result => {
            let r = format.assocArrayFromJSON(result);
            res.json(format.getFormatRes(true, r, null));
//                res.json(format.getFormatRes(true, format.assocArrayFromJSON(result), null));
        })
        .catch(err => {
            res.json(format.getFormatRes(false, null, err));
        });

});

/**
 * @api {get} /lpu/getdocurl Ссылка на страницу доктора
 * @apiGroup lpu
 * @apiVersion 0.0.1
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */

app.get("/lpu/getdocurl", function(req,res) {
    if (req.query && req.query.p_doctor_id) {
        execute.executeRes(sql_frame2_get_doc_url, {p_doctor_id: req.query.p_doctor_id})
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
 * @api {get} /lpu/rnumblist Список талонов специалиста
 * @apiGroup lpu
 * @apiVersion 0.0.1
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *  {
 *   }
 *
 */

app.get("/lpu/rnumblist", function(req,res) {
    if (req.query
        && req.query.doctor_id
        && req.query.spec_id
        && req.query.srv_ids
    ) {
        let params = { p_doctor_id : req.query.doctor_id
            , p_spec_id : req.query.spec_id
            , p_srv_ids : req.query.srv_ids
        };
        execute.executeRes(sql_frame2_get_rnumb_list, params)
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


module.exports = app;

