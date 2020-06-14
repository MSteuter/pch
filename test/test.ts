import {EMPTY} from 'rxjs';
import {switchMap} from 'rxjs/operators';
import {CleanHome} from '../src/clean-home';
import {CleanHomeCoapClient} from '../src/clean-home-coap-client';
import {CleanHomeCoapHelper} from '../src/clean-home-coap-helper';
import {DefaultLogger} from '../src/logging/logger';

const extractArg = (index: number) => {
    return process.argv[index + 2].substr(process.argv[index + 2].indexOf('=') + 1);
};

const host: string = extractArg(0);
const port: number = parseInt(extractArg(1));


// let cleanHome = new CleanHome(host, port, new DefaultLogger());
//
// cleanHome.status().subscribe(value => {
//     console.log(value);
// });

const response = '<encoded string>';

let decoded = CleanHomeCoapHelper.decode(response);

console.log(decoded);

const encodedCounter = response.substring(0, 8);

console.log(CleanHomeCoapHelper.decodeCounter(encodedCounter));



// setTimeout(() => {
//     cleanHome.control('aqil', Math.floor(Math.random() * Math.floor(100)) + 1 + '').subscribe(value => {
//         console.log(value);
//     });
// }, 5000);
//
// setTimeout(() => {
//     cleanHome.control('aqil', Math.floor(Math.random() * Math.floor(100)) + 1 + '').subscribe(value => {
//         console.log(value);
//     });
// }, 10000);



// let client = new CleanHomeCoapClient(host, port, new DefaultLogger());
//
// client.sync().pipe(switchMap(value => {
//     return client.control('<id>', 'aqil', Math.floor(Math.random() * Math.floor(100)) + 1 + '');
// })).subscribe(value => {
//     console.log(value);
// });


// client.sync().subscribe(value => {
//     console.log(value);
//
//     client.status().subscribe(value1 => {
//
//         console.log(value1);
//
//
//     });
// });

// setTimeout(() => {
//     client.stopStatusObservation();
// }, 10000);

// client.ping().pipe(switchMap(value => {
//     console.log(value);
//
//     return client.info();
// }),switchMap(detected => {
//     console.log(detected);
//
//     if (detected) {
//         return client.sync();
//     } else {
//         return EMPTY;
//     }
// }), switchMap(value => {
//     console.log(value);
//     return client.control('<id>', 'aqil', '4');
// })).subscribe(value => {
//     console.log(value);
//
//     // client.reset();
// }, error => {
//     console.log(error);
//
//     // client.reset();
// });

