import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'

const app = express()

app.use(cors({
    origin:process.env.CORS_ORGIN,
    credentials:true,
}))

// inserting the middlewares
app.use(express.json({limit: "16kb"}))

app.use(express.urlencoded({extended:true,limit:"16kb"})) // we can write objects in objects with extended

app.use(express.static("public")) //which makes public assests or to store as folders

app.use(cookieParser())


export {app}