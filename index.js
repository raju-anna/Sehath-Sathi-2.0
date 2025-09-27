import connectDB from "./db/dbindex.js"
import app from "./app.js"
import express from "express"
import dotenv from "dotenv"

dotenv.config({
    path : './.env'
})

app.on("error", (error) => {
    console.log("ERROR :". error)
    throw error
})

connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running at port : ${process.env.PORT}`)
    })
})
.catch((err) => {
    console.log("MONGO db connection failed")
})
