const express = require('express');
const app = express();
const format = require("../utils/format");

const fs = require('fs');


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
app.get("/action/list", function(req,res) {
console.log('Start');
    let tmp = fs.readFileSync("action.json", 'utf8');
console.log('load tmp=', tmp);
    try {
       let tmpJSON = JSON.parse(tmp);
 console.log('load tmpJSON=', tmpJSON);
        res.json(format.getFormatRes(true, tmpJSON, null));
    } catch (err) {
        console.error('Ошибка JSON файла ERR=', err)
        res.json(format.getFormatRes(false, null, err));
    }
});

module.exports = app;
