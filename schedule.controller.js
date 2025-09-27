// fileName: schedule.controller.js

import { asyncHandler } from "../utilities/asyncHandler.js";
import { ApiError } from "../utilities/ApiError.js";
import { ApiResponse } from "../utilities/ApiResponse.js";
import { Schedule } from "../models/schedule.model.js"

// --- Get all Schedule Templates (as they are generally reusable) ---
const getSchedulesForUser = asyncHandler(async(req, res) => {
    const schedules = await Schedule.find({});
    
    return res
        .status(200)
        .json(new ApiResponse(200, schedules, "Schedule templates fetched successfully"));
});

// --- Create a new Schedule Template ---
const createScheduleTemplate = asyncHandler( async (req, res) => {
    const { dayOfWeek, time } = req.body;

    if (!dayOfWeek || !time) {
        throw new ApiError(400, "Day of week and time are required for a schedule template");
    }

    // Check if a similar schedule already exists to prevent duplication
    const existingSchedule = await Schedule.findOne({ dayOfWeek, time });
    if (existingSchedule) {
        return res
            .status(200) 
            .json(new ApiResponse(200, existingSchedule, "Schedule template already exists"));
    }

    const schedule = await Schedule.create({
        dayOfWeek,
        time
    });

    return res
        .status(201)
        .json(new ApiResponse(201, schedule, "Schedule template created successfully"));
});

// --- Update a Schedule Template ---
const updateScheduleTemplate = asyncHandler(async(req, res) => {
    const { scheduleId } = req.params;
    const { dayOfWeek, time } = req.body;

    if (!dayOfWeek && !time) {
        throw new ApiError(400, "At least one field (dayOfWeek or time) is required for update");
    }

    const updatedSchedule = await Schedule.findByIdAndUpdate(
        scheduleId,
        { $set: { dayOfWeek, time } },
        { new: true, runValidators: true }
    );

    if (!updatedSchedule) {
        throw new ApiError(404, "Schedule template not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, updatedSchedule, "Schedule template updated successfully"));
});

// --- Delete a Schedule Template ---
const deleteScheduleTemplate = asyncHandler(async(req, res)=>{
    const { scheduleId } = req.params;

    // NOTE: Check if this schedule is actively used by any MedicineSchedule before deletion!

    const deletedSchedule = await Schedule.findByIdAndDelete(scheduleId);

    if(!deletedSchedule){
        throw new ApiError(404, "Schedule template not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Schedule template deleted successfully"));
});

export {
    createScheduleTemplate,
    getSchedulesForUser,
    updateScheduleTemplate,
    deleteScheduleTemplate
};