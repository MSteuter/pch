export class LogHelper {
    public static uint8ArrayToOneLine(array: Uint8Array): string {
        return Buffer.from(array).toString('hex');
    }
}