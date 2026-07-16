/* Модуль обработки картинок */
// const logger = require('../utils/logger')('util-img');
const cfg = require('../config');
const execute =  require('../utils/execute');
const format = require("../utils/format");
const fs = require('fs');
// const stream = require("stream");
const sb = require('../utils/streamBuffer');




const sql_get_doc_list_img = "BEGIN "+cfg.db.packageName+".get_doc_list_img(:p_label, :cursor); END;";
const sql_get_doc_photo_blob = "BEGIN "+cfg.db.packageName+".get_doc_photo_blob(:p_db_keyid, :cursor); END;";


let params = null;
let statusJOB = false;
const folderDoc = 'static/doc/';
let pathDoc = '';

class img {

// инициализация модуля
    constructor(init) {
        console.log('cls init=' + JSON.stringify(init));
        params = init;
        console.log('params=', params);
        pathDoc = this.getDir() + folderDoc;
        console.log('pathDoc=', pathDoc);
    }

// Получить рабочий каталог
    getDir() {
        // TODO: проверить на Linux
        let path = process.cwd();
        return path + '/';
    }

// Обработка
    JOB$() {
        return new Promise((resolve, reject) => {
            let resJOB = []; // Результат
// 1) Получить весь список докторов
            this.getListDocImg$(params.prefix_doc_photo)
                .then(res1 => {
                    let r = format.assocArrayFromJSON(res1);
                    console.log('1) Doc list full =', r);
                    resJOB = r;
// 2) Отфильтровать по размеру
                    return this.getFiltrDocImg$(r);
                })
                .then(resF => {  // Результат после фильтра
// 3) Выгрузить фоток в файлы
                    console.log('2) resF=', resF);
                    this.saveFiles$(resF)
                        .then( resSF => {
                            console.log('saveFiles$ res=', resSF);
                            resolve(resSF);
                        })
                        .catch(errSF => {
                            console.log('errSF=', errSF);
                            reject(errSF);
                        });
                })
                .catch(err => {
                    reject(err);
                });

        });
    };

    // Получение списка докторов с меткой файла
    getListDocImg$(label) {
        return new Promise((resolve, reject) => {
            execute.executeRes(sql_get_doc_list_img, {p_label: label})
                .then(result => {
                    let r = format.assocArrayFromJSON(result);
                    resolve(r);
                })
                .catch(err => {
                    reject(err);
                })
        })
    };

// фильтр по размеру файла
    getFiltrDocImg$(arrData) {
        return new Promise((resolve, reject) => {
            arrData.forEach(item => {
                item.isJob = false; // Добавляем флаг  для обработки
                item.ErrMes = '';   // Текст ошибки выполнения
                if (item.db_file_size <= params.file_max_size){
                    item.isJob = true;
                } else {
                    item.ErrMes = `Размер файла в БД (${item.db_file_size}) > ${params.file_max_size}`;
                }
            });
            resolve(arrData);
        });
    }

    // Сравнение размера и сохранение в файл
    getFileSizeToSave$(doc){
        return new Promise((resolve, reject) => {
            this.findFileSize$(doc.linkid + '.png') // Получение размера
                .then(resSize => {
                    if (resSize != doc.db_file_size) { // Картинки разные
                        this.saveFile$(doc)
                            .then(res => {
                                doc.isJob = true;
                                doc.ErrMes = '';
                                resolve(doc);
                            })
                            .catch(err => {
                                doc.isJob = false;
                                doc.ErrMes = '';
                                resolve(doc);
                            });
                    } else {
                        doc.isJob = false;
                        doc.ErrMes = 'Файлы одинаковые по размеру!';
                        resolve(doc);
                    }
                })
                .catch(err => {
                    doc.ErrMes = err;
                    resolve(doc);
                });
        });
    };

// Поиск файла с доктором - вернет размер
    findFileSize$(fileName){
        return new Promise((resolve, reject) => {
            try {
                var stats = fs.statSync(pathDoc + fileName);
                resolve(stats.size);
            }
            catch (e) {
                resolve(-1);  // Если файл не найден
                console.log('ERR findFile=', e);
            }
        });
    }

// Выгрузка всех файлов
    saveFiles$(arrData) {
        let saveRes = [];
        return new Promise((resolve, reject) => {
            const promises = [];
            let saveRes = [];
            let prIndex = [];
            // Перебор всех данных
            arrData.forEach((DataItem, DataIndex) => {
                if (DataItem.isJob == true) {
//                    promises.push(this.findFileSize$(DataItem.linkid + '.png'));
                    promises.push(this.getFileSizeToSave$(DataItem));
                    prIndex.push(DataIndex);
                }
            });

            Promise.all(promises)  // Получили размеры файлов
                .then(res => {
// console.log('Promise.all getFileSizeToSave$=', res);
// TODO: не понятно !!!
/*
                    res.forEach((itemSize, indexSize) => {   // Перебор результатов
                        // Проверка на размер файла и в БД
/!*
                        if (itemSize != arrData[prIndex[indexSize]].file_size) { // Картинки разные
                            // Выгрузка в файл
                            pr.push(this.saveFile$(arrData[prIndex[indexSize]]));
                        } else { // Одинаковые файлы
                            arrData[prIndex[indexSize]].ErrMes = 'Файлы одинаковые по размеру!';
                        }
*!/
                    }); // ARRAY
*/
console.log('END arrData=', arrData)
                    resolve(arrData);
                })
                .catch(err => {
                    reject(err);
                });
        });
    };

//  Выгрузка файла
    saveFile$(doc) {
        const pathFile = pathDoc + doc.linkid + '.png';
        return new Promise((resolve, reject) => {
            execute.executeRes(sql_get_doc_photo_blob, {p_db_keyid: doc.keyid})
                .then(result => {
                    if (result && result[0] && result[0].BYTES){
                        let blob = result[0].BYTES;
// console.log('blob DATA=', blob);
                        let loadFile = true;
                        var outStream = fs.createWriteStream(pathFile);
                        outStream.on('error', function(err) { console.error(err); loadFile = false});
//                        console.error('loadFile 11loadFile=', loadFile);
                        if (loadFile) {
                            sb.bufferToStream(blob).pipe(outStream);
//                            sb.bufferToStream(blob).pipe(fs.createWriteStream(pathFile));
                            console.log('save to file=', pathFile);
                        } else {
                            console.error('loadFile !!!');
                        }
                        console.error('loadFile END');
                        resolve(true);
                    } else {
                        resolve(false);
//                        reject(false);
                    }
                })
                .catch(error => {
                    console.error('saveFile$ :', error);
                    resolve(false);
//                    reject(error);
                })
         });
    }
}

module.exports.img = img;
