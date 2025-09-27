// fileName: user.controller.js

import { asyncHandler } from "../utilities/asyncHandler.js";
import { ApiError } from "../utilities/ApiError.js";
import { ApiResponse } from "../utilities/ApiResponse.js";
import mongoose from "mongoose";
import { User } from "../models/user.model.js"

// New: Get the logged-in user
const getUser = asyncHandler(async(req, res) => {
    // `req.user.sub` is the Auth0 User ID provided by the `authorize` middleware
    const auth0UserId = req.user.sub;

    const user = await User.findOne({ auth0UserId }).select("-auth0UserId");
    
    if (!user) {
        throw new ApiError(404, "User not found. Run /sync first.");
    }
    
    return res
        .status(200)
        .json(new ApiResponse(200, user, "User details fetched successfully"));
});


const updateOrCreateUser = asyncHandler(async(req, res) => {
    
    // `req.user` is available because of the `authorize` middleware
    const auth0UserId = req.user.sub;
    // Extract info from Auth0 token (provided by `auth.middleware.js`)
    const { name: fullName, email, phone_number: phonenumber } = req.user;

    let user = await User.findOne({ auth0UserId });

    if (!user) {
        if(!fullName || !email){
            // It's Auth0's responsibility to provide these, but check just in case.
            throw new ApiError(400,"User details missing from token")
        }
        
        // Create new user in your DB
        user = new User({
            auth0UserId,
            fullName: fullName || '',
            email: email || '',
            phonenumber: phonenumber || '', // Auth0 may provide this
        });

        await user.save();
    }

    // The user object sent back to the frontend should be clean
    const userResponse = await User.findById(user._id).select("-auth0UserId");

    return res
    .status(200)
    .json(new ApiResponse(200, userResponse, "User synced successfully"))
})

// New: Update the logged-in user's profile details
const updateAccountDetails = asyncHandler(async(req, res) => {
    const { fullName, phonenumber } = req.body;
    const auth0UserId = req.user.sub;

    if (!fullName && !phonenumber) {
        throw new ApiError(400, "Full name or phone number is required to update.");
    }

    const updatedUser = await User.findOneAndUpdate(
        { auth0UserId },
        {
            $set: {
                fullName,
                phonenumber
            }
        },
        { new: true, runValidators: true }
    ).select("-auth0UserId");

    if (!updatedUser) {
        throw new ApiError(404, "User not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, updatedUser, "Account details updated successfully"));
});


export {updateOrCreateUser, getUser, updateAccountDetails}