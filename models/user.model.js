// fileName: user.model.js
import mongoose,{Schema}  from "mongoose"
// import jwt from "jsonwebtoken"
// import bcrypt from "bcrypt"

const userSchema = new Schema({

    auth0UserId:{
        type : String,
        required : true,
        unique : true
    },
    patientsList :[{
        type : Schema.Types.ObjectId,
        ref : "Patient"
    }],
    phonenumber : {
        type : String, // Changed to String for better compatibility with international formats
    },
    email : {
        type : String,
        required : true,
        unique : true,
        lowercase : true,
        trim : true
    },
    fullName : {
        type : String,
        required : true,
        trim : true,
        index : true
    },
    // Removed password field as Auth0 is handling authentication
    
},{timestamps : true})

export const User = mongoose.model("User",userSchema)