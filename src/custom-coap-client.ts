import {CoapClient} from 'node-coap-client';
import {createDeferredPromise} from 'node-coap-client/build/lib/DeferredPromise';
import {Origin} from 'node-coap-client/build/lib/Origin';

/**
 * We overwrite the CoapClient because we want to use keep-alive but we also want to have multiple connections
 * because otherwise sync and control fails. change the connection.
 */
export class CustomCoapClient extends CoapClient {

    public static originalConnectionFunction: Function;

    public static myGetConnection(origin: Origin): Promise<any> {
        const url: URL = (origin as any).url;
        const path = url.pathname;

        const originString = origin.toString().toLowerCase();
        if ((CoapClient as any).connections.has(originString) && !(path === '/sys/dev/sync' || path === '/sys/dev/control')) {
            // debug(`getConnection(${originString}) => found existing connection`);
            // return existing connection
            return Promise.resolve((CoapClient as any).connections.get(originString));
        } else if ((CoapClient as any).pendingConnections.has(originString) && !(path === '/sys/dev/sync' || path === '/sys/dev/control')) {
            // debug(`getConnection(${originString}) => connection is pending`);
            // return the pending connection promise
            return (CoapClient as any).pendingConnections.get(originString);
        } else {
            // debug(`getConnection(${originString}) => establishing new connection`);
            // create a promise and start the connection queue
            const ret = createDeferredPromise<any>();
            (CoapClient as any).pendingConnections.set(originString, ret);
            setTimeout((CoapClient as any).workOffPendingConnections, 0);
            return ret;
        }
    }
}

(Origin as any).fromUrl = (url: URL) => {
    const result = new Origin(url.protocol, url.hostname, +url.port);
    (result as any).url = url;
    return result;
};
CustomCoapClient.originalConnectionFunction = (CoapClient as any).getConnection;
(CoapClient as any).getConnection = CustomCoapClient.myGetConnection;