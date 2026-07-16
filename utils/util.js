async function loadModule(pathModule) {
    try {
        const myModule = await import(pathModule);
    } catch (err) {
        console.error('Ошибка загрузки модуля:', err.message);
    }
}


module.exports.loadModule = loadModule;
