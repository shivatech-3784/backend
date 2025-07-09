import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadFileOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"


const GenerateAcessAndRefreshToken = async(userId) =>{
    const user = await User.findById(userId)
    const accessToken = await user.GenerateAcessToken()
    const refreshToken = await user.GenerateRefreshToken()
  
    // updating the refresh token in the database
    user.refreshToken = refreshToken
    await user.save({ValidityBeforeSave: false}) // validate function because without that password will be encrypted again 

    return {accessToken, refreshToken}

}

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
    const {fullname,username,email,password} =  req.body
    
    console.log(req.body)
    //validation - not empty
    if(
        [fullname,username,email,password].some((field) => field?.trim() === "") //This function takes a single argument called field and returns true if:
        // 1.field is not null or undefined (because of ?.),
        // AND its trimmed version is an empty string ("").
    ){
        throw new ApiError(400,"All fields are required")
    }
    
    //check if user already exist: username , email
    const existedUser = await User.findOne({
        $or: [{username}, {email}]
    })  

    if(existedUser){
        throw new ApiError(409,"User with email or username all ready exist")
    }
    console.log(req.files)
    
    //check for images,check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverimageLocalPath = req.files?.coverimage[0]?.path; // giving undefined when we not upload coverimage

    let coverimageLocalPath;
    if(req.files && Array.isArray(req.files.coverimage) && req.files.coverimage.length>0){
        coverimageLocalPath = req.files.coverimage[0].path;
    }

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

const loginUser  =  asyncHandler(async (req,res) =>{

    // req.body -> data
    // username or email 
    //find user
    //check password
    //refresh and access token
    //send cookie


    //get user details from the frontend
    const {username, email, password} = req.body

    // username or email 
    if(!username && !email){
        throw new ApiError(400, "username or email is required")
    }
    
    //find user
    const user = await User.findOne({
        $or: [{username} ,{email}]
    })
    
    if(!user){
        throw new ApiError(404,"user not exist please Register")
    }
    // here u should not use User it belongs to mondoDB model not the actual user 
    const matchPassword = await user.isPasswordCorrect(password)

    if(!matchPassword){
        throw new ApiError(401,"invalid password credentials")
    }
    
    //refresh and access token
    const {accessToken,refreshToken} = await GenerateAcessAndRefreshToken(user._id)
    
    // we dont show password and refreshToken to the user 
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure:true
    }
    
    return await res.status(201)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            //data
            {  
                user: loggedInUser,accessToken,refreshToken
            },
             "user Logged in Sucessfully"

        )
    )

})

const logoutUser = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set : {refreshToken:undefined}
        },
        {
            new:true
        }
    )
      const options = {
        httpOnly: true,
        secure:true
    }

    return await res
    .status(201)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken",options)
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

const refreshAccessToken = asyncHandler(async(req,res)=>{

    const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401,"unauthorized access")
    }
     
    try {
        const decodedtoken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedtoken?._id)
    
        if(!user){
            throw new ApiError(401,"invalid refresh token")
        }
    
        const options = {
             httpOnly:true,
             secure:true
        }
        
        const {accessToken,newRefreshToken} = GenerateAcessAndRefreshToken(user._id)
    
        res.
        status(201)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(
            new ApiResponse(
                200,
                {accessToken,refreshToken:newRefreshToken},
                "Access Token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid Refresh Token")
    }
    
})


export  {registerUser,loginUser,logoutUser,refreshAccessToken}