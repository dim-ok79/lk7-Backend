async function loadModule(pathModule) {
    try {
        const myModule = await import(pathModule);
    } catch (err) {
        console.error('Ошибка загрузки модуля:', err.message);
    }
}

function loadModuleApp(app, pathModule) {
    try {
        app.use(require(pathModule));
    } catch (err) {
        console.error('Ошибка загрузки APP модуля:', err.message);
    }
}

module.exports.loadModule = loadModule;
module.exports.loadModuleApp = loadModuleApp;
