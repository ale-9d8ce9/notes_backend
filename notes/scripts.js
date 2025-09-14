
/*exports.base64ToArrayBuffer = function(base64) {
    console.log('base64ToArrayBuffer', base64)
    const buffer = Buffer.from(base64, 'base64')
    return buffer.buffer
}*/
exports.base64ToArrayBuffer = function (base64String) {
    // Decode the base64 string into a Buffer
    const buffer = Buffer.from(base64String, 'base64');

    // Create a new ArrayBuffer with the same length as the buffer
    const arrayBuffer = new ArrayBuffer(buffer.length);

    // Create a Uint8Array view of the new ArrayBuffer
    const view = new Uint8Array(arrayBuffer);

    // Copy the contents of the buffer into the view
    buffer.copy(view);

    return arrayBuffer;
}
exports.arrayBufferToBase64 = function(arrayBuffer) {
    const buffer = Buffer.from(arrayBuffer)
    return buffer.toString('base64')
}