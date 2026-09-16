const crypto = require('crypto');

class TmpTokenArray {
    constructor(timeSeconds) {  // timeSeconds - время жизни
        this.storage = [];
        this.time = timeSeconds * 1000; // переводим в миллисекунды
    }

    // Генерируем токен
    tmpTokenGenerateId(length = 10) {
        return crypto
            .randomBytes(Math.ceil(length / 2))
            .toString('hex')
            .slice(0, length);
    }

    // Добавить значение
    add(value) {
        const expiresAt = Date.now() + this.time;
        this.storage.push({ value, expiresAt });
        this.cleanup();
    }

    // Получить только актуальные значения
    getValues() {
        this.cleanup();
        return this.storage.map(item => item.value);
    }

    getValue(tmpToken) {
        this.cleanup();
        return this.storage.filter(item => item.value.id == tmpToken)[0]
//        return this.storage.map(item => item.value);
    }

    // Удалить элементы, у которых истекло время жизни
    cleanup() {
        const now = Date.now();
        this.storage = this.storage.filter(item => item.expiresAt > now);
    }
}

module.exports = TmpTokenArray;
