export class GrixError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'GrixError';
    }
}

export class AuthenticationError extends GrixError {
    constructor(message = 'Authentication failed. Please check your API credentials.') {
        super(message);
        this.name = 'AuthenticationError';
    }
}

export class InvalidParameterError extends GrixError {
    constructor(message: string) {
        super(message);
        this.name = 'InvalidParameterError';
    }
}

export class ServiceUnavailableError extends GrixError {
    constructor(message = 'The Grix service is currently unavailable. Please try again later.') {
        super(message);
        this.name = 'ServiceUnavailableError';
    }
}

export class ApiError extends GrixError {
    public code: number;
    public response?: unknown;

    constructor(message: string, code: number, response?: unknown) {
        super(message);
        this.name = 'ApiError';
        this.code = code;
        this.response = response;
    }
} 