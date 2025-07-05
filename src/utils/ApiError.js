class ApiError extends Error {
    constructor(
        statusCode,            // e.g. 404
        message = "Something went wrong",
        errors = [],          // array of details (validation errors, etc.)
        stack = ""           // optional custom stack trace

    ) {
        super(message) //super(message); = “Hey, parent Error class—please do your usual setup with this text as the error message, so my custom error starts life as a proper Error object.”
        this.statusCode = statusCode; // HTTP status
        this.data = null;       // space for extra payload if you need it
        this.message = message;    // (already set by super, but kept for clarity)
        this.success = false;      // hard‑coded because an error = failure
        this.errors = errors 


        if (stack) {
            this.stack = stack
        } else {
            Error.captureStackTrace(this, this.constructor)
            //Error.captureStackTrace reseats the stack so it points at the place you threw ApiError, not the internals of the class.
        }
    }
}

export { ApiError }