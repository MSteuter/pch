import {Observable, of, throwError} from 'rxjs';
import {delay, mergeMap, retryWhen, switchMap, tap} from 'rxjs/operators';
import {CleanHomeCoapClient} from './clean-home-coap-client';
import {CleanHomeError} from './clean-home-error';
import {CleanHomeErrorType} from './clean-home-error-type';
import {Logger} from './logging/logger';

export class CleanHome {

    private coapClient: CleanHomeCoapClient;

    private deviceId: string = '1';

    constructor(host: string, port: number, private logger: Logger) {
        this.coapClient = new CleanHomeCoapClient(host, port, logger);
    }

    public status(): Observable<object> {
        return this.doSubscribe().pipe(retryWhen(errors => errors.pipe(delay(1000))),tap(response => {
            if (typeof (response as any).state.reported.DeviceId !== 'undefined') {
                this.deviceId = (response as any).state.reported.DeviceId;
            }
        }));
    }

    public control(key: string, value: string) {
        let deviceId: string = this.deviceId as string;

        return this.doControl(deviceId, key, value).pipe(mergeMap(response => {
            if((response as string).includes('failed')) {
                return throwError(new CleanHomeError('Could not send command', CleanHomeErrorType.MESSAGE_ID));
            } else {
                return of(response);
            }
        }));
    }

    private doControl(deviceId: string, key: string, value: string) {
        return this.coapClient.sync().pipe(switchMap(() => {
            return this.coapClient.control(deviceId, key, value);
        }));
    }

    private doSubscribe(): Observable<object> {
        return this.coapClient.sync().pipe(switchMap(() => {
            return this.coapClient.status().pipe();
        }));
    }

    public stopSubscribe() {
        this.coapClient.stopStatusObservation();
    }
}