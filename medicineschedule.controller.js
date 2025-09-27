// fileName: medicineschedule.controller.js

import { asyncHandler } from "../utilities/asyncHandler.js";
import { ApiError } from "../utilities/ApiError.js";
import { ApiResponse } from "../utilities/ApiResponse.js";
import { MedicineSchedule } from "../models/medicineschedule.js"
import { Medicine } from "../models/medicine.model.js"
import { Patient } from "../models/patient.model.js"
import { User } from "../models/user.model.js"

// --- Assign a Medication to a Schedule ---
const assignMedicationToSchedule = asyncHandler( async (req, res) => {
    const { medicineId, scheduleId, patientId } = req.body;

    if (!medicineId || !scheduleId || !patientId) {
        throw new ApiError(400, "Medicine ID, Schedule ID, and Patient ID are required");
    }

    // 1. Ownership Check: Verify the patient belongs to the current user
    const auth0UserId = req.user.sub;
    const user = await User.findOne({ auth0UserId });
    if (!user || !user.patientsList.includes(patientId)) {
        throw new ApiError(403, "Forbidden: Patient does not belong to this user");
    }

    // 2. Medicine Check: Verify medicine belongs to this patient
    const medicine = await Medicine.findById(medicineId);
    if (!medicine || medicine.patient.toString() !== patientId) {
        throw new ApiError(404, "Medicine not found or does not belong to the patient");
    }

    // 3. Prevent duplicate entry (same medicine, same schedule)
    const existingEntry = await MedicineSchedule.findOne({ medicine: medicineId, schedule: scheduleId });
    if (existingEntry) {
        return res
            .status(200) 
            .json(new ApiResponse(200, existingEntry, "Medication is already assigned to this schedule"));
    }

    // 4. Create the MedicineSchedule link
    const medSchedule = await MedicineSchedule.create({
        medicine: medicineId,
        schedule: scheduleId
    });
    
    // 5. Update Patient's medicineSchedule list
    await Patient.findByIdAndUpdate(
        patientId,
        { $push: { medicineSchedule: medSchedule._id } },
        { new: true }
    );

    return res
        .status(201)
        .json(new ApiResponse(201, medSchedule, "Medication assigned to schedule successfully"));
});

// --- Get all Medication Schedules for a Patient ---
const getMedicationSchedulesForPatient = asyncHandler(async(req, res) => {
    const { patientId } = req.params;

    // 1. Ownership Check: Verify the patient belongs to the current user
    const auth0UserId = req.user.sub;
    const user = await User.findOne({ auth0UserId });
    if (!user || !user.patientsList.includes(patientId)) {
        throw new ApiError(403, "Forbidden: Patient does not belong to this user");
    }
    
    // 2. Fetch the patient and populate the schedule links
    const patient = await Patient.findById(patientId)
        .populate({
            path: 'medicineSchedule',
            populate: [
                { path: 'medicine', select: 'name stock' },
                { path: 'schedule', select: 'dayOfWeek time' }
            ]
        })
        .select('fullName medicineSchedule');

    if (!patient) {
        throw new ApiError(404, "Patient not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, patient.medicineSchedule, "Medication schedules fetched successfully"));
});

// --- Delete a Medication Schedule link ---
const deleteMedicationSchedule = asyncHandler(async(req, res)=>{
    const { medScheduleId } = req.params;
    
    // 1. Find the link to determine the patient (for ownership check)
    const medSchedule = await MedicineSchedule.findById(medScheduleId).populate({
        path: 'medicine',
        select: 'patient'
    });

    if (!medSchedule) {
        throw new ApiError(404, "Medication schedule not found");
    }
    
    const patientId = medSchedule.medicine.patient;

    // 2. Ownership Check (re-using logic)
    const auth0UserId = req.user.sub;
    const user = await User.findOne({ auth0UserId });
    if (!user || !user.patientsList.includes(patientId)) {
        throw new ApiError(403, "Forbidden: Patient does not belong to this user");
    }

    // 3. Delete the MedicineSchedule link
    await MedicineSchedule.findByIdAndDelete(medScheduleId);
    
    // 4. Remove the reference from the Patient document
    await Patient.findByIdAndUpdate(
        patientId,
        { $pull: { medicineSchedule: medScheduleId } },
        { new: true }
    );

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Medication schedule deleted successfully"));
});


export {
    assignMedicationToSchedule,
    getMedicationSchedulesForPatient,
    deleteMedicationSchedule
};