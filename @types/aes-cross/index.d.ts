declare module 'aes-cross' {

    const aescross: AesCross;
    export default aescross;

    interface AesCross {
        encText(text: string, key: Buffer, newIv: Buffer, input_encoding: string, output_encoding: string): string;
        decText(text: string, key: Buffer, newIv: Buffer, input_encoding: string, output_encoding: string): string;

        setKeySize(keySize: number): void;
    }
}