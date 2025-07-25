import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"

export const verifyJWT = asyncHandler(async (req, _, next) => {

    try {
        const token = req.cookies?.accessToken || req.header("Autherization")?.replace("Bearer", "")

        if (!token) {
            throw ApiError(401, "unauthorized request")
        }

        const decodedtoken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

        const user = await User.findById(decodedtoken?._id).select("-password -refreshToken")

        if (!user) {
            throw ApiError(401, "Invalid access token")
        }

        req.user = user
        next()
    } catch (error) {
        throw new ApiError(401,"Invalid access token")
    }
})