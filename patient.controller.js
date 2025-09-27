// fileName: patient.controller.js

import { asyncHandler } from "../utilities/asyncHandler.js";
import { ApiError } from "../utilities/ApiError.js";
import { ApiResponse } from "../utilities/ApiResponse.js";
import mongoose from "mongoose";
import { Patient } from "../models/patient.model.js"
import { User } from "../models/user.model.js"

const addPatient = asyncHandler( async (req, res) => {

    const { fullName, phonenumber } = req.body // Assuming frontend sends phone number too
    const auth0UserId = req.user.sub;

    if( !fullName || !phonenumber ){
        throw new ApiError(400, "Full Name and Phone Number are required")        
    }

    // 1. Find the current Caretaker (User)
    const caretaker = await User.findOne({ auth0UserId });
    if (!caretaker) {
        throw new ApiError(404, "Caretaker not found. Please sync your user account.");
    }

    // 2. Create the new Patient
    const patient = await Patient.create({
        caretaker: caretaker._id, // Link to the user's ID
        fullName,
        // medicinesList is initialized as an empty array in the model, no need to pass it
    })

    // 3. Update the Caretaker's patientList
    caretaker.patientsList.push(patient._id);
    await caretaker.save({ validateBeforeSave: false });

    // 4. Return the new patient
    const createdPatient = await Patient.findById(patient._id)

    if(!createdPatient){
        throw new ApiError(500, "Something went wrong while adding the Patient")
    }

    return res.status(201).json(
        new ApiResponse(200, createdPatient, "Patient registered successfully")
    )
})

// New: Get all patients for the current user
const getPatientsForUser = asyncHandler(async(req, res) => {
    const auth0UserId = req.user.sub;

    // Find the current user
    const user = await User.findOne({ auth0UserId }).populate("patientsList");
    if (!user) {
        throw new ApiError(404, "User not found.");
    }

    // `patientsList` is already populated
    return res
    .status(200)
    .json(new ApiResponse(200, user.patientsList, "Patients fetched successfully"));
});


const updatePatient = asyncHandler(async(req, res) => {

    const {id} = req.params // Patient ID is in params
    const {fullName} = req.body // Only allowing name update for now

    if(!fullName) {
        throw new ApiError(400, "Patient's Full Name is required")
    }

    // IMPORTANT: Verify the patient belongs to the current user
    const auth0UserId = req.user.sub;
    const user = await User.findOne({ auth0UserId });
    if (!user.patientsList.includes(id)) {
        throw new ApiError(403, "Forbidden: Patient does not belong to this user");
    }

    const updatedPatient = await Patient.findByIdAndUpdate(
        id,
        {
            $set : {
                fullName,
            }
        },
        {new : true}
    )

    if (!updatedPatient) {
        throw new ApiError(404, "Patient not found")
    }


    return res
    .status(200)
    .json(new ApiResponse(200, updatedPatient, "Patient details updated successfully"))
})

const deletePatient = asyncHandler(async(req, res)=>{

    const {id} = req.params // Patient ID
    const auth0UserId = req.user.sub;

    // 1. Verify and remove from User's list
    const user = await User.findOne({ auth0UserId });
    if (!user.patientsList.includes(id)) {
        throw new ApiError(403, "Forbidden: Patient does not belong to this user");
    }
    user.patientsList = user.patientsList.filter(pId => pId.toString() !== id);
    await user.save({ validateBeforeSave: false });

    // 2. Delete the Patient document
    const deletedPatient = await Patient.findByIdAndDelete(id)

    if(!deletedPatient){
        throw new ApiError(404, "Patient not found")
    }
    
    // NOTE: In a real app, also delete associated Medicine and MedicineSchedule documents!

    return res
    .status(200)
    .json(new ApiResponse(200, null, "Patient deleted successfully"))
})

export {
    addPatient,
    updatePatient,
    deletePatient,
    getPatientsForUser // Export the new function
}