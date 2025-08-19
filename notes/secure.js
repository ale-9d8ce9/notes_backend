
exports.hashPassword = function(password, salt) {
  const crypto = require("crypto");
  salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return JSON.stringify({ salt: salt, hash: hash });
}

exports.verifyHash = function(password, salt, hash) {
  const crypto = require("crypto");
  const hashToVerify = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return hash === hashToVerify;
}



