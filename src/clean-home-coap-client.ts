// import {CoapClient} from 'node-coap-client';
import {CustomCoapClient as CoapClient} from './custom-coap-client';
import {Options, NumericOption} from 'node-coap-client/build/Option';
import {from, Observable} from 'rxjs';
import {map, timeout} from 'rxjs/operators';
import {CleanHomeCoapHelper} from './clean-home-coap-helper';
import {CleanHomeError} from './clean-home-error';
import {CleanHomeErrorType} from './clean-home-error-type';
import {Logger} from './logging/logger';

export class CleanHomeCoapClient {

    private static readonly DEFAULT_TIMEOUT = 5000;

    private statusCounter: number = 0;
    private controlCounter: number = 0;

    constructor(private host: string, private port: number, private logger: Logger) {
        process.on('beforeExit', (code: number) => {
            this.logger.debug(`rest CoAP on beforeExit. Code=${code}`);
            CoapClient.reset();
        });

        process.on('exit', (code: number) => {
            this.logger.debug(`rest CoAP on exit. Code=${code}`);
            CoapClient.reset();
        });

        // Overwrite Options to allow length 0 of Observe option
        const temp: any = Options;

        const newOptions: any = {};

        Object.keys(temp).forEach(key => {
            newOptions[key] = temp[key];
        });

        // overwrite Observe
        newOptions.Observe = (observe: boolean) => {
            // TODO: Not sure regarding deregister.
            return new NumericOption(6, 'Observe', false, 3, Buffer.from(observe ? '' : ([1] as any as string)));
        };

        // replace options completely. Necessary because properties cannot be overwritten.
        (Options as any) = newOptions;
    }

    public info(requestTimeout: number = CleanHomeCoapClient.DEFAULT_TIMEOUT): Observable<any> {
        return from(CoapClient.request(this.getUrl('sys/dev/info'), 'get'))
            .pipe(timeout(requestTimeout), map(value => {
                if (value.payload) {
                    return value.payload.toString('utf-8');
                } else {
                    return undefined;
                }
            }));
    }

    public sync(requestTimeout: number = CleanHomeCoapClient.DEFAULT_TIMEOUT): Observable<number | undefined> {
        return from(CoapClient.request(this.getUrl('sys/dev/sync'), 'post',
            Buffer.from(CleanHomeCoapHelper.encodeCounter(this.statusCounter, 8)), {keepAlive: false}))
            .pipe(timeout(requestTimeout), map(value => {
                if (value.payload) {
                    const response = value.payload.toString('utf-8');

                    this.controlCounter = CleanHomeCoapHelper.decodeCounter(response);
                    return this.controlCounter;
                } else {
                    throw new Error('No response received for sync call. Cannot proceed');
                }
            }));
    }

    public control(deviceId: string, key: string, value: string, requestTimeout: number = CleanHomeCoapClient.DEFAULT_TIMEOUT): Observable<any> {

        let message = {
            state: {
                desired: {
                    CommandType: 'app',
                    DeviceId: deviceId,
                    EnduserId: '1'
                }
            }
        };

        (message.state.desired as any)[key] = value;
        const messageString = JSON.stringify(message);

        if (this.controlCounter == 2000000000) {
            this.controlCounter = 1;
        } else {
            this.controlCounter = this.controlCounter + 1;
        }

        let encodedCounter = CleanHomeCoapHelper.encodeCounter(this.controlCounter, 8);

        let keyAndIv = CleanHomeCoapHelper.bufferToHexString(CleanHomeCoapHelper.toMD5('JiangPan' + encodedCounter));

        const secretKey = keyAndIv.substring(0, keyAndIv.length / 2);
        const iv = keyAndIv.substring(keyAndIv.length / 2, keyAndIv.length);
        const encodedMessage = CleanHomeCoapHelper.bufferToHexString(Buffer.from(CleanHomeCoapHelper.toAES(messageString, secretKey, iv)));

        let result = encodedCounter + encodedMessage;

        const hash = CleanHomeCoapHelper.bufferToHexString(Buffer.from(CleanHomeCoapHelper.toSha256(result)));

        result = encodedCounter + encodedMessage + hash;

        this.logger.fine(`coap:\nmessage: ${messageString}\nencodedCounter: ${encodedCounter}\nkeyAndIv: ${keyAndIv}\nsecretKey: ${secretKey}\niv: ${iv}\nencodedMessage: ${encodedMessage}\nhmac-sha-256: ${hash}`);

        return from(CoapClient.request(this.getUrl('sys/dev/control'), 'post',
            Buffer.from(result), {keepAlive: false})).pipe(map(response => {
            return response.payload;
        }));
    }

    public status(): Observable<object> {
        return new Observable(subscriber => {
            CoapClient.observe(this.getUrl('sys/dev/status'), 'get', resp => {

                if (resp.payload) {
                    const response = resp.payload.toString('utf-8');
                    const encodedCounter = response.substring(0, 8);
                    let counter = CleanHomeCoapHelper.decodeCounter(encodedCounter);

                    const hash = response.substring(response.length - 64);
                    const encodedMessageAndCounter = response.substring(0, response.length - 64);

                    const hashedMessage = CleanHomeCoapHelper.bufferToHexString(Buffer.from(CleanHomeCoapHelper.toSha256(encodedMessageAndCounter)));

                    if (counter < 1 || counter > 2000000000 ||
                        ((counter < this.statusCounter && this.statusCounter < 2000000000 - 10) ||
                            ((counter > this.statusCounter + 10 && counter < 2000000000) ||
                                (2000000000 - this.statusCounter < 10 && counter < this.statusCounter &&
                                    (10 - (2000000000 - this.statusCounter)) + 1 < counter && counter < this.statusCounter)))) {
                        subscriber.error(new CleanHomeError('Invalid message id', CleanHomeErrorType.MESSAGE_ID));
                    }
                    if (hash !== hashedMessage) {
                        subscriber.error(new CleanHomeError('Invalid message hash', CleanHomeErrorType.HASH));
                    }
                    if (counter >= 2000000000) {
                        counter = 1;
                    }

                    this.statusCounter = counter;

                    let keyAndIv = CleanHomeCoapHelper.bufferToHexString(CleanHomeCoapHelper.toMD5('JiangPan' + encodedCounter));
                    const secretKey = keyAndIv.substring(0, keyAndIv.length / 2);
                    const iv = keyAndIv.substring(keyAndIv.length / 2, keyAndIv.length);
                    const encodedMessage = response.substring(8, response.length - 64);
                    const message = CleanHomeCoapHelper.fromAES(encodedMessage, secretKey, iv);

                    if (message == null || encodedMessage == null) {
                        subscriber.error(new CleanHomeError('Could not decode message or message empty', CleanHomeErrorType.DECODE));
                    }

                    this.logger.fine(`coap:\nmessage: ${message}\nencodedCounter: ${encodedCounter}\nkeyAndIv: ${keyAndIv}\nsecretKey: ${secretKey}\niv: ${iv}\nencodedMessage: ${encodedMessage}\nhmac-sha-256: ${hash}`);

                    try {
                        subscriber.next(JSON.parse(message));
                    } catch (e) {
                        subscriber.error(new CleanHomeError('Could not parse JSON', CleanHomeErrorType.JSON_DECODE, e));
                    }
                } else {
                    // TODO: Can we see that? If so we can sync!
                    subscriber.next(undefined);
                }
            }, undefined, {
                confirmable: false // we expect no answer here in the typical coap way.
                // retransmit: false
            }).then(() => {
                // TODO: nothing?
            }).catch(reason => subscriber.error(reason));
        });
    }

    public stopStatusObservation(): void {
        CoapClient.stopObserving(this.getUrl('sys/dev/status'));
        // due to the fact that the library does not actually deregister or at least the target does not recognize it
        // we still get message but are not forwarded to subscriber. Therefore, we reset the complete connection.
        this.reset();
    }

    public ping(): Observable<boolean> {
        return from(CoapClient.ping(this.getUrl()));
    }

    private getUrl(path?: string) {
        if (path) {
            return `coap://${this.host}:${this.port}/${path}`;
        } else {
            return `coap://${this.host}:${this.port}`;
        }
    }

    public reset() {
        CoapClient.reset();
    }
}