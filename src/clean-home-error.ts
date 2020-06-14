import {CleanHomeErrorType} from './clean-home-error-type';

export class CleanHomeError extends Error {

    constructor(message: string, public type: CleanHomeErrorType, public cause?: Error) {
        super(message);
    }
}