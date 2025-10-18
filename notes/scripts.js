
exports.base64ToArrayBuffer = function (base64String) {
    const buffer = Buffer.from(base64String, 'base64')
    const arrayBuffer = new ArrayBuffer(buffer.length)
    const view = new Uint8Array(arrayBuffer)
    buffer.copy(view)
    return arrayBuffer
}
exports.arrayBufferToBase64 = function(arrayBuffer) {
    const buffer = Buffer.from(arrayBuffer)
    return buffer.toString('base64')
}