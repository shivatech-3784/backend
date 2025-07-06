import mongoose,{Schema} from 'mongoose'
import jwt from 'jsonwebtoken' // jwt is bearer token that means whoever has the token who sends the request i will send the key(authentication) like that 
import bcrypt from 'bcrypt'

const userSchema = new mongoose.Schema(
{
  username:{
    type:String,
    required:true,
    lowercase:true,
    unique:true,
    trim :true,
    index:true // it will be used for searching in the database of MongoDB
  },
  email:{
    type:String,
    required:true,
    lowercase:true,
    unique:true,
    trim :true,
  },
  fullname:{
    type:String,
    required:true,
    trim :true,
    index:true // it will be used for searching in the database of MongoDB
  },
  avatar:{
    type:String, // cloudnery url will come we will accept it as string 
    required:true,
  },
  coverimage:{
    type:String,
  },
  watchHistory:[
    {
        type:mongoose.Schema.Types.ObjectId,
        ref:"Video",
    }
  ],
  password:{
    type:String,
    required:[true, 'password is Required']
  },
  refreshToken:{
    type:String
  }

}
,{timestamps:true})

//pre encrypts the password just before the user use it
// it is a middleware Hook

//In arrow function this keyword is not applicable it doesnot know the context

//save event is taking on the userSchema so knowing the context is necessary thats why we are using function but encryption takes some time to process it so we are using async funtion to some time
userSchema.pre("save",async function (next) {
   
   if(!this.isModified("password")) return next()
   
   this.password = await bcrypt.hash(this.password,10)
   next()
})

// COMPARING THE PASSWORD BEFORE LOGIN GIVEN PASSWORD AND ENCRYPTED PASSWORD IS SAME OR NOT

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password,this.password)
}

userSchema.methods.GenerateAcessToken = function (){
    return jwt.sign(
     // payload
     {
      _id: this._id,
      username:this.username,
      email : this.email,
      fullname : this.fullname,
     },
     //secret key
     process.env.ACCESS_TOKEN_SECRET,
     {
       expiresIn: process.env.ACCESS_TOKEN_EXPIRY
     }
   )
}

userSchema.methods.GenerateRefreshToken = function (){
    return jwt.sign(
     // payload
     {
      _id: this._id,

     },
     //secret key
     process.env.REFRESH_TOKEN_SECRET,
     {
       expiresIn: process.env.REFRESH_TOKEN_EXPIRY
     }
   )
}


export const User = mongoose.model("User",userSchema)