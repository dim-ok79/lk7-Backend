let captchaList = [];

function add(captcha, solid) {
    console.log('add s=', captcha);
    captchaList.push({captcha: captcha, solid: solid});
    console.log('add captchaList=', captchaList);
}

function get(solid) {
    let f = null;
// console.log('GEt Solid=', solid);
    captchaList.forEach(item => {
//        console.log('GEt Solid item=', item);
        if (item.solid == solid) {
            f = item.captcha;
        }
//        else { console.log(item.solid,'<>', solid);}
    });
    return f;
}

/* Удалить качу */
function del(captcha) {
    for (var i = 0; i < captchaList.length; i++) {
        if (captchaList[i].captcha == captcha) {
            captchaList.splice(i,1);
            return true;
        }
    }
    return false;
}


module.exports.add = add;
module.exports.get = get;
module.exports.del = del;
