//The intent is exactly the same as in your earlier example: wrap any sync or async Express route/controller so that if it throws or returns a rejected promise, the error gets forwarded to your centralized error‑handling middleware (next(err)).

const asyncHandler = (requestHandler) =>{
    return (req,res,next) =>{
        Promise.resolve(requestHandler(req,res,next))
        .catch((err)=>next(err))
    }
}

export {asyncHandler}


// const asyncHandler = (func) => {()=>{}} higher order function where function is passed as a parameter and will returns something in that we have another function   || asyncHandler is higher‑order—it takes a function (func) as input and returns a new function.

// const asyncHandler = (func) => async (req,res,next) => { this is the try catch code
//    try {
//      await func(req,res,next)
//    } catch (error) {
//       res.status(error.code || 500).json({
//         success:false,
//         message: error.message
//       })
//    }
// }