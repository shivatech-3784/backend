import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadFileOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) =>{
    
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
    const {fullname,username,email,password} = req.body
    
    //validation - not empty
    if(
        [fullname,username,email,password].some((field) => field?.trim() === "") //This function takes a single argument called field and returns true if:
        // 1.field is not null or undefined (because of ?.),
        // AND its trimmed version is an empty string ("").
    ){
        throw new ApiError(400,"All fields are required")
    }
    
    //check if user already exist: username , email
    const existedUser = User.findOne({
        $or: [{username}, {email}]
    })

    if(existedUser){
        throw new ApiError(409,"User with email or username all ready exist")
    }
    
    //check for images,check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverimageLocalPath = req.files?.coverimage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }

    //upload them to cloudnary
    const avatar = await uploadFileOnCloudinary(avatarLocalPath);
    const coverimage = await uploadFileOnCloudinary(coverimageLocalPath);   

    if(!avatar){
        throw new ApiError(400,"Avatar file is required")
    }
    
    //create user object - create entry in db
    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverimage :coverimage?.url || "",
        email,
        password,
        username:username?.toLowerCase()
    })
    
    //remove password and refresh token field from response
    const createdUser =  await User.findById(user._id).select("-password -refreshToken")
    
    // check for user creation
    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering the user")
    }

    // return response
    return await res.status(201).json(
        new ApiResponse(200,"User registered successfully!!",createdUser)
    )


})


export  {registerUser}