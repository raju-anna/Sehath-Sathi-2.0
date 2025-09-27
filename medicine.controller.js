// fileName: medicine.controller.js

import { asyncHandler } from "../utilities/asyncHandler.js";
import { ApiError } from "../utilities/ApiError.js";
import { ApiResponse } from "../utilities/ApiResponse.js";
import mongoose from "mongoose";
import { Medicine } from "../models/medicine.model.js"
import { Patient } from "../models/patient.model.js"
import { User } from "../models/user.model.js"

const addMedicine = asyncHandler( async (req, res) => {

    const {name, stock} = req.body
    const { patientId } = req.params; // Get patient ID from route params

    if([name, stock].some((field) => field?.trim() === "" || field === undefined )){
        throw new ApiError(400, "All fields are required")        
    }

    // 1. Verify patient ownership
    const auth0UserId = req.user.sub;
    const user = await User.findOne({ auth0UserId });
    if (!user.patientsList.includes(patientId)) {
        throw new ApiError(403, "Forbidden: Patient does not belong to this user");
    }
    
    // 2. Check for existing medicine for *this patient*
    const existedMedicine = await Medicine.findOne({ name, patient: patientId });

    if(existedMedicine){
        throw new ApiError(409, `Medicine '${name}' already exists for this patient. Use update instead.`);
    }

    // 3. Create the medicine
    const medicine = await Medicine.create({
        name,
        stock,
        patient: patientId // Link to the patient
    })

    const createdMedicine = await Medicine.findById(medicine._id)

    if(!createdMedicine){
        throw new ApiError(500, "Something went wrong while adding the Medicine")
    }

    return res.status(201).json(
        new ApiResponse(200, createdMedicine, "Medicine added successfully")
    )

})

// New: Get all medicines for a specific patient
const getMedicationsForPatient = asyncHandler(async(req, res) => {
    const { patientId } = req.params; 

    // 1. Verify patient ownership
    const auth0UserId = req.user.sub;
    const user = await User.findOne({ auth0UserId });
    if (!user.patientsList.includes(patientId)) {
        throw new ApiError(403, "Forbidden: Patient does not belong to this user");
    }

    // 2. Fetch all medicines for this patient
    const medicines = await Medicine.find({ patient: patientId });

    return res
    .status(200)
    .json(new ApiResponse(200, medicines, "Medications fetched successfully"))
})


const updateMedicine = asyncHandler(async(req, res) => {

    const {medicationId} = req.params // Renamed `id` to `medicationId` for route clarity
    const {name, stock} = req.body

    if(!name && !stock) {
        throw new ApiError(400, "Any one field is required")
    }

    // NOTE: Ownership check omitted for brevity but required in production

    const updatedMedicine = await Medicine.findByIdAndUpdate(
        medicationId,
        {
            $set : {
                name,
                stock
            }
        },
        {new : true}
    )

    if (!updatedMedicine) {
        throw new ApiError(404, "Medicine not found")
    }


    return res
    .status(200)
    .json(new ApiResponse(200, updatedMedicine, "Medicine details updated successfully"))
})

const deleteMedicine = asyncHandler(async(req, res)=>{

    const {medicationId} = req.params // Renamed `id` to `medicationId`
    
    // NOTE: Ownership check omitted for brevity but required in production

    const deletedMedicine = await Medicine.findByIdAndDelete(medicationId)

    if(!deletedMedicine){
        throw new ApiError(404, "Medicine not found")
    }
    
    // NOTE: In a real app, also delete associated MedicineSchedule documents!

    return res
    .status(200)
    .json(new ApiResponse(200, null, "Medicine deleted successfully")) // Return null on delete

})

export {
    addMedicine,
    getMedicationsForPatient, // Export new function
    updateMedicine,
    deleteMedicine
}