import mongoose from 'mongoose'

import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2' //When you need to:Run complex aggregation queries (e.g. $lookup, $group, $match, etc.)And 
// paginate the result (limit to 10 results per page, with total count, etc.)

const videoSchema = new mongoose.Schema(
{
    videoFile:{
        type:String,
        required:true,
        unique:true
    },
    thumbnail:{
        type:String,
        required:true,
    },
    owner:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    },
    title:{
        type:String,
        required:true
    },
    description:{
        type:String,
        requried:true,
    },
    duration:{
        type:Number,
        required:true,
    },
    views:{
        type:Number,
        required:true,
        default:0,
    },
    isPublished:{
        type:Boolean,
        default:true
    }

}
,{timestamps:true})

videoSchema.plugin(mongooseAggregatePaginate)

export const Video = mongoose.model("Video",videoSchema)