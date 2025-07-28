const crypto = require('crypto');

const algorithm = 'aes-256-cbc';
// Use uma chave de 32 bytes e um IV de 16 bytes em produção, nunca deixe hardcoded!
const key = crypto.scryptSync('senha-forte', 'salt', 32);
const iv = Buffer.alloc(16, 0); // IV fixo para exemplo, use um IV aleatório em produção

function encrypt(text) {
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

function decrypt(encrypted) {
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

module.exports = { encrypt, decrypt };
