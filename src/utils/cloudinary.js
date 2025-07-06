import { v2 as cloudinary } from 'cloudinary'

import fs from 'fs'


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_KEY_SECRET
});


const uploadFileOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return  null 
        // upload file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath ,{
            resource_type:"auto"
        }) 
        console.log("file is uploaded on cloudinary ",response.url)
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath) // as we are removing the locally saved temporary file as the file upload operation got failed
        console.log("Unable to upload files", error)
        return null;
    }
}

export {uploadFileOnCloudinary}