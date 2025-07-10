import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadFileOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose"


const GenerateAcessAndRefreshToken = async (userId) => {
    const user = await User.findById(userId)
    const accessToken = await user.GenerateAcessToken()
    const refreshToken = await user.GenerateRefreshToken()

    // updating the refresh token in the database
    user.refreshToken = refreshToken
    await user.save({ ValidityBeforeSave: false }) // validate function because without that password will be encrypted again 

    return { accessToken, refreshToken }

}

const registerUser = asyncHandler(async (req, res) => {

    //get user details from the frontend
    //validation - not empty
    //check if user already exist: username , email
    //check for images,check for avatar
    //upload them to cloudnary
    //create user object - create entry in db
    //remove password and refresh token field from response
    // check for user creation
    // return response


    //get user details from the frontend
    const { fullname, username, email, password } = req.body

    console.log(req.body)
    //validation - not empty
    if (
        [fullname, username, email, password].some((field) => field?.trim() === "") //This function takes a single argument called field and returns true if:
        // 1.field is not null or undefined (because of ?.),
        // AND its trimmed version is an empty string ("").
    ) {
        throw new ApiError(400, "All fields are required")
    }

    //check if user already exist: username , email
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username all ready exist")
    }
    console.log(req.files)

    //check for images,check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverimageLocalPath = req.files?.coverimage[0]?.path; // giving undefined when we not upload coverimage

    let coverimageLocalPath;
    if (req.files && Array.isArray(req.files.coverimage) && req.files.coverimage.length > 0) {
        coverimageLocalPath = req.files.coverimage[0].path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    //upload them to cloudnary
    const avatar = await uploadFileOnCloudinary(avatarLocalPath);
    const coverimage = await uploadFileOnCloudinary(coverimageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    //create user object - create entry in db
    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverimage: coverimage?.url || "",
        email,
        password,
        username: username?.toLowerCase()
    })

    //remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    // check for user creation
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    // return response
    return await res.status(201).json(
        new ApiResponse(200, "User registered successfully!!", createdUser)
    )


})

const loginUser = asyncHandler(async (req, res) => {

    // req.body -> data
    // username or email 
    //find user
    //check password
    //refresh and access token
    //send cookie


    //get user details from the frontend
    const { username, email, password } = req.body

    // username or email 
    if (!username && !email) {
        throw new ApiError(400, "username or email is required")
    }

    //find user
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "user not exist please Register")
    }
    // here u should not use User it belongs to mondoDB model not the actual user 
    const matchPassword = await user.isPasswordCorrect(password)

    if (!matchPassword) {
        throw new ApiError(401, "invalid password credentials")
    }

    //refresh and access token
    const { accessToken, refreshToken } = await GenerateAcessAndRefreshToken(user._id)

    // we dont show password and refreshToken to the user 
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return await res.status(201)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                //data
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "user Logged in Sucessfully"

            )
        )

})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { refreshToken: undefined }
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure: true
    }

    return await res
        .status(201)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(
                200,
                {

                },
                "user loggedout sucessfully!!"
            )
        )
})

// actually access token is short lived and refresh token is long lived when user logged in the site as long as he using that site the access token time will complete server tells user to relogin again inorder to get ridoff this situation we use refreshToken where it clicks a point where it regenerate access token to avoid relogging 

const refreshAccessToken = asyncHandler(async (req, res) => {

    const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized access")
    }

    try {
        const decodedtoken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

        const user = await User.findById(decodedtoken?._id)

        if (!user) {
            throw new ApiError(401, "invalid refresh token")
        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, newRefreshToken } = GenerateAcessAndRefreshToken(user._id)

        res.
            status(201)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access Token refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh Token")
    }

})

const changeCurrentPassword = asyncHandler(async (req, res) => {

    const { oldPassword, newPassword } = req.body

    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400,
            "Invalid old password"
        )
    }

    user.password = newPassword
    await user.save({ ValidityBeforeSave: false })

    return await res
        .status(201)
        .json(
            new ApiResponse(200, {}, "Password changed Successfully!!")
        )

})

const getCurrentUser = asyncHandler(async (req, res) => {
    return await res
        .status(201)
        .json(
            new ApiResponse(200, req.user, "current user fetched successfully")
        )
})

const updateAccountDetails = asyncHandler(async (req, res) => {

    const { fullname, email } = req.body

    if (!fullname || !email) {
        throw new ApiError(400, "All fields are required")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            fullname,
            email: email
        },
        { new: true }
    ).select("-password")

    return res
        .status(201)
        .json(
            new ApiResponse(400, user, "Account updated successfully!")
        )

})

const updateUserAvatar = asyncHandler(async (req, res) => {

    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400,
            "Upload avatar file"
        )
    }

    const avatar = await uploadFileOnCloudinary(avatarLocalPath);

    if (!avatar.url) {
        throw new ApiError(400,
            " Error while uploading avatar"
        )
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("-password")

    return res.
        status(201)
        .json(
            new ApiResponse(400, user, "avatar update successfully")
        )
})

const updateUserCoverImage = asyncHandler(async (req, res) => {

    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400,
            "Upload coverimage file"
        )
    }

    const coverImage = await uploadFileOnCloudinary(coverImageLocalPath);

    if (!coverImage.url) {
        throw new ApiError(400,
            " Error while uploading avatar"
        )
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverimage: coverImage.url
            }
        },
        { new: true }
    ).select("-password")

    return res.
        status(201)
        .json(
            new ApiResponse(400, user, "coverImage update successfully")
        )
})

const getUserChannelProfile = asyncHandler(async (req, res) => {

    const { username } = req.params

    if (!username) {
        throw ApiError(400, `user is not existing with the ${username}`)
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {   // to know the no. of subscribers mongoDB use to create document who are subscribed to that channel for example if 3 users like a,b,c are there who subscribed a channel name CAC there fore 3 document each object have {channelname,user} are created to know the subscribers we need to count the document where in that channel name is CAC
            $lookup: {
                from: "subscriptions",
                localField: "_id", // here user_id becomes user_id itself 
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {   // for knowing the no.of channels that a user subscribed we need to count the document in that user is present like one user subscribed channel CAC, FCC, HCC then 3 document created in the name of user 'X' 
            $lookup: {
                from: "subscriptions",
                localField: "_id", // here user_id becomes channel_id
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                // how many users subscribed his channel 
                subscribersCount: {
                    $size: "$subscribers"
                },

                // how many channels that he subscribed to 
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                //isSubscribedTo that tells you, for each document flowing through the pipeline, whether the currently logged‑in user is among its subscribers.

                // Suppose a video document looks like:
                // {
                //   "_id": "v1",
                //   "title": "How to Deploy with Vite",
                //   "subscribers": [
                //     { "subscriber": "u10" },
                //     { "subscriber": "u23" }
                //   ]
                // }
                // …and req.user.id === "u23":

                // $in → checks "u23" against ["u10", "u23"] → returns true.

                // $cond → yields true.

                // The pipeline attaches "isSubscribedTo": true to this document.

                // If req.user.id were "u45", $in would return false and isSubscribedTo would be false.
                isSubscribedTo: {
                    $cond: {
                        if: { $in: [req.user?.id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project:{
                fullname:1,
                username:1,
                subscribersCount:1,
                channelsSubscribedToCount:1,
                isSubscribedTo:1,
                email:1,
                avatar:1,
                coverimage:1
            }
        }
    ])
    console.log(channel)

    if(!channel?.length){
        throw ApiError(404,"channel does not exist")
    }

    return res
    .status(201)
    .json(
        new ApiResponse(200,channel[0],"User channel fetched successfully!")
    )
})

const getUserWatchHistory = asyncHandler(async(req,res) =>{

    const user = User.aggregate([
        {
            $match:{
               _id: new mongoose.Schema.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",// we got everything from user model with this lookup we dont need all those we need only watch history so we add another pipeline what ever we need we want to keep it in owner so we are writing one more pipeline inside 

                            pipeline:[
                                {
                                    $project:{
                                        fullname:1,
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]
                            
                        }
                    },
                     // we get array from this to get object from that array we used addfield
                    {
                        $addFields:{
                            owner:{
                                $first:owner
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res.
    status(201).
    json(
        new ApiResponse(200,
            user[0].watchHistory,
            "WatchHistory of User is fetched Successfully")
    )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getUserWatchHistory
}