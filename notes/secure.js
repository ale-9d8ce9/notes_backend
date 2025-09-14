exports.AES_GCM = {}


exports.hashPassword = function(password, salt) {
    const crypto = require("crypto")
    salt = crypto.randomBytes(32).toString('hex')
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex')
    return JSON.stringify({ salt: salt, hash: hash })
}

exports.verifyHash = function(password, salt, hash) {
    const crypto = require("crypto")
    const hashToVerify = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex')
    return hash === hashToVerify
}




exports.AES_GCM.encrypt = async function (key, data) {
    const { webcrypto } = require('crypto')
    const iv = webcrypto.getRandomValues(new Uint8Array(12))
    const dataAsArrayBuffer = new TextEncoder().encode(data)
    const encryptedData = await webcrypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv,
        },
        key,
        dataAsArrayBuffer
    )

    return {data: encryptedData, iv: iv}
}

exports.AES_GCM.decrypt = async function (key, data, iv) {
    const { webcrypto } = require('crypto')
    try {
        const decryptedData = await webcrypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv,
            },
            key,
            data
        )
        return new TextDecoder().decode(decryptedData)
    } catch (e) {
        console.error("Decryption failed. Data may have been tampered with.", e)
    }
}


exports.AES_GCM.getKey = async function () {
    const { webcrypto } = require('crypto')
    const key = await webcrypto.subtle.generateKey(
        {
            name: "AES-GCM",
            length: 256,
        },
        true,
        ["encrypt", "decrypt"]
    )
    return key
}


exports.exportKey = async function (key) {
    const { webcrypto } = require('crypto')
    const exported = await webcrypto.subtle.exportKey("raw", key)
    return new Uint8Array(exported)
}

exports.importKey = async function (keyData) {
    const { webcrypto } = require('crypto')
    const key = await webcrypto.subtle.importKey(
        "raw",
        keyData,
        {
            name: "AES-GCM",
            length: 256,
        },
        false,
        ["encrypt", "decrypt"]
    )
    return key
}


exports.encrypt = async function (key, data) {
    const scripts = require('./scripts')
    let encryptedBinary = await exports.AES_GCM.encrypt(key, data)
    let encryptedData = {
        data: await scripts.arrayBufferToBase64(encryptedBinary.data),
        iv: encryptedBinary.iv.toString()
    }
    return encryptedData
}

exports.decrypt = async function (key, data) {
    const scripts = require('./scripts')
    data.data = await scripts.base64ToArrayBuffer(data.data)
    let iv = new Uint8Array(data.iv.split(','))
    let decrypted = await exports.AES_GCM.decrypt(key, data.data, iv)
    return decrypted
}