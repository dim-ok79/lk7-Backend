const logger = require('./logger')('format');

// Проверка на JSON
/*
function IsJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}
*/

// Проверка на JSON
function isJSON (something) {
    if (typeof something != 'string')
        something = JSON.stringify(something);

    try {
        JSON.parse(something);
        return true;
    } catch (e) {
        return false;
    }
}

let isArrayMap = function(obj) {
    let f = false;
    if (Array.isArray(obj)){
        f = true;
    }
    if (obj instanceof Map){
        f = true;
    }
    return f;
}

let objectKeysToLowerCase = function (origObj) {   // в нижний регистр
// console.log('origObj=', origObj);
//    if (Array.isArray(origObj) && (origObj instanceof Map)) {
    if (isArrayMap(origObj)){
        let objArray = [];
        let tmp = [];
        if (origObj instanceof Map) {
            objArray = Array.from(origObj);
        } else {
            objArray = origObj;
        }

        if (objArray[0] && typeof objArray[0] == 'string') {  // Проверка на массив без ключей
            for (let i = 0; i < objArray.length; i++) {
                tmp.push(objArray[i]);
            }
        } else {
            for (let i = 0; i < objArray.length; i++) {
                tmp.push(objectKeysToLowerCase(objArray[i]));
            }
        }
        return tmp;
    } else {
        return Object.keys(origObj).reduce(function (newObj, key) {
            let val = origObj[key];
            let newVal = (isArrayMap(val)) ? objectKeysToLowerCase(val) : val;
            newObj[key.toLowerCase()] = newVal;
            return newObj;
        }, {});
    }
}

function assocArrayFromJSON(json) {
    if (json) {
        return objectKeysToLowerCase(json);
    } else {
        return {};
    }
}

/* Формат результата АПИ */
function getFormatRes(success, data, msg) {
// console.log('Format data=', data);
    let r;
    try {
        r = {
            success: success,
            data: assocArrayFromJSON(data),
            msg:msg,
        };
        return r;
    } catch (e) {
        return {
            success: success,
            data: data,
            msg:msg,
        };
    }
}

module.exports.assocArrayFromJSON = assocArrayFromJSON;
module.exports.getFormatRes = getFormatRes;
