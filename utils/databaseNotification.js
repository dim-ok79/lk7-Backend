const logger = require('../utils/logger')('notification');
const execute =  require('../utils/execute')
const ws = require('./ws-socket');

const sql_get_notification = "BEGIN solution_med.pkg_ws_electronic_queue.get_notification(:rowid, :cursor); END;";
const sql_get_notifications = "BEGIN solution_med.pkg_ws_electronic_queue.get_notifications(:cursor); END;";
const sql_set_notification_status = "BEGIN solution_med.pkg_ws_electronic_queue.set_notification_status(:p_row_id, :p_status, :cursor); END;";
const sql_set_notification_status2 = "BEGIN solution_med.pkg_ws_electronic_queue.set_notification_status2(:id, :status, :cursor); END;";

function setNotificationStatus2(id, status) {
    return new Promise((resolve, reject) => {
        execute.executeRes( sql_set_notification_status2, {id: id, status: status})
            .then(responseData => {
                logger.info(`setNotificationStatus2(`+ JSON.stringify({id: id, status: status})+`) RES:` + JSON.stringify(responseData));
                console.log('setNotificationStatus2 - responseData=', responseData);
                resolve(responseData);
            }).catch((err) => {
            logger.info(`setNotificationStatus2(`+ JSON.stringify({id: id, status: status})+`) ERR:` + JSON.stringify(err));
            console.error('setNotificationStatus2 ERR=', err);
                reject(err);
        });

    });
}

function setNotificationStatus(rowid, status) {
    return new Promise((resolve, reject) => {
        execute.executeRes( sql_set_notification_status, {p_row_id: rowid, p_status: status})
            .then(responseData => {
                logger.info(`setNotificationStatus(`+ JSON.stringify({p_row_id: rowid, p_status: status})+`) RES:` + JSON.stringify(responseData));
                resolve(responseData);
/*
                if (responseData.success === true) {
                    console.log('RES=== ', responseData.data);
                }
*/
            }).catch((err) => {
            logger.info(`setNotificationStatus(`+ JSON.stringify({p_row_id: rowid, p_status: status})+`) ERR:` + JSON.stringify(err));
            console.error('setNotificationStatus ERR=', err);
                reject(err);
        });

    });
}

function getListNotification(table) {
    let ROWID = table.rows[0].rowid;
console.log('getListNotification rowid:', ROWID);
    logger.info(`Notification row_id: ${ROWID}`);
    execute.executeRes( sql_get_notification, {rowid: ROWID})
        .then(responseData => {
            logger.info('sql_get_notification responseData:' + JSON.stringify(responseData));
console.log('sql_get_notification responseData:', responseData);
            if (responseData.success && responseData.data && responseData.data.length > 0 ){
                for (let i = 0; i < responseData.data.length; i++) {
                    setNotificationStatus(ROWID, 1);  // Приняли в работу
                    ws.sendNotification(responseData.data[i].DEVICE_CODE, responseData.data[i].NOTIFICATION_EVENT_TYPE, responseData.data[i].NOTIFICATION_ID)
                        .then( ress => {
                            setNotificationStatus(ROWID, 2); // Отправили
                        }).catch(errr => {
                        setNotificationStatus(ROWID, 3);  // Ошибка отправки
                    });
                }
            }
        }).catch(err => {
        logger.info('NEW err=' + JSON.stringify(err));
console.error('NEW err=', err);
        });

}

/*
function getListNotification0(tableName) {
    execute.executeRes( sql_get_notifications, null)
        .then(responseData => {
// console.log('getListNotification - responseData=', responseData);
            if (responseData.success === true) {
 console.log('RES=== ', responseData.data);
                if (responseData.data && responseData.data.length > 0 ){
                    for (let i = 0; i < responseData.data.length; i++) {
//                        console.log('DEVICE_CODE=', responseData.data[i].DEVICE_CODE);
                        setNotificationStatus(responseData.data[i].NOTIFICATION_ID, 1);  // Приняли в работу

                        ws.sendNotification(responseData.data[i].DEVICE_CODE, responseData.data[i].NOTIFICATION_EVENT_TYPE)
                            .then( ress => {
                                setNotificationStatus(responseData.data[i].NOTIFICATION_ID, 2); // Отправили
                            }).catch(errr => {
                                setNotificationStatus(responseData.data[i].NOTIFICATION_ID, 3);  // Ошибка отправки
                        });
                    }

                }
//                ws.sendNotification('TV_REG_1', 'INIT');
//                ws.sendNotification(responseData.data[0].DEVICE_CODE, responseData.data[0].NOTIFICATION_EVENT_TYPE);
            }
        }).catch((err) => {
            console.error('getListNotification=', err);
        });
//    execute.executeQuery( sql_get_notifications, res, req.query)
//    ws.sendNotification('TV_REG_1','INIT');
}
*/

ws.event.on('NotificationStatus2', data => {
    setNotificationStatus2(data.id, data.status)
})

module.exports = {
    getListNotification,
    setNotificationStatus,
    setNotificationStatus2
};
