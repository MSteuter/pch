import * as crypto from 'crypto';
import aescross from 'aes-cross';

export class CleanHomeCoapHelper {

    public static decode(response: string): {encodedCounter: string, keyAndIv: string, secretKey: string, iv: string, encodedMessage: string, message: string} {
        const encodedCounter = response.substring(0, 8);
        console.log(encodedCounter);
        let keyAndIv = CleanHomeCoapHelper.bufferToHexString(CleanHomeCoapHelper.toMD5('JiangPan' + encodedCounter));
        const secretKey = keyAndIv.substring(0, keyAndIv.length / 2);
        const iv = keyAndIv.substring(keyAndIv.length / 2, keyAndIv.length);
        const encodedMessage = response.substring(8, response.length - 64);
        return {
            encodedCounter: encodedCounter,
            keyAndIv: keyAndIv,
            secretKey: secretKey,
            iv: iv,
            encodedMessage: encodedMessage,
            message: CleanHomeCoapHelper.fromAES(encodedMessage, secretKey, iv)
        };
    }

    public static decodeCounter(encodedCounter: string) {
        let counterUpperCase = encodedCounter.toUpperCase();
        let length = counterUpperCase.length;

        let counter = 0;
        for (let i = length; i > 0; i--) {
            let charAt = counterUpperCase.charAt(i - 1);
            counter = (counter) + Math.pow(16.0, length - i) * ((charAt < '0' || charAt > '9') ? charAt.charCodeAt(0) - '7'.charCodeAt(0) : charAt.charCodeAt(0) - '0'.charCodeAt(0));
        }
        return counter;
    }

    public static encodeCounter(counter: number, length: number) {
        let hex = this.toHexString(counter);
        if (hex.length % 2 === 1) {
            hex = '0' + hex;
        }
        return this.prependZero(hex.toUpperCase(), length);
    }

    public static prependZero(value: string, length: number) {
        let result = '';
        for (let i = 0; i < length - value.length; i++) {
            result = '0' + result;
        }
        return (result + value).substring(0, length);
    }

    public static toMD5(value: string) {
        return crypto.createHash('md5').update(value).digest();
    }

    public static toSha256(value: string) {
        return crypto.createHash('sha256').update(value).digest();
    }

    private static alphabet = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];

    public static bufferToHexString(buffer: Buffer) {
        return buffer.toString('hex').toUpperCase();
    }

    public static oldCustomEncode(buffer: Buffer) {
        let cArr = [];

        let i = 0;
        for (let j = 0; j < buffer.length; j++) {
            let i3 = i + 1;

            cArr[i] = this.alphabet[(buffer[j] >>> 4) & 15];
            i = i3 + 1;
            cArr[i3] = this.alphabet[buffer[j] & 15];
        }

        return cArr.join('');
    }

    public static toHexString(value: number) {
        return value.toString(16);
    }

    static toAES(message: string, key: string, iv: string): Buffer {
        aescross.setKeySize(128);

        return this.hexToBytes(aescross.encText(message, Buffer.from(key), Buffer.from(iv), 'utf-8', 'hex'));
    }

    static fromAES(message: string, key: string, iv: string): string {
        aescross.setKeySize(128);

        return aescross.decText(message, Buffer.from(key), Buffer.from(iv), 'utf-8', 'hex');
    }

    public static hexToBytes(hex: string) {
        const bytes = Buffer.alloc(hex.length / 2);
        let pos = 0;
        for (let c = 0; c < hex.length; c += 2) {
            bytes.fill(parseInt(hex.substr(c, 2), 16), pos, pos + 1);
            pos++;
        }
        return bytes;
    }

    public static bytesToHex(bytes: Buffer) {
        const hex = [];
        for (let i = 0; i < bytes.length; i++) {
            var current = bytes[i] < 0 ? bytes[i] + 256 : bytes[i];
            hex.push((current >>> 4).toString(16));
            hex.push((current & 0xF).toString(16));
        }
        return hex.join('');
    }
}