import mongoose,{Schema} from "mongoose"

const medicineScheduleSchema = new Schema({
    medicine : {
        type : Schema.Types.ObjectId,
        ref : "Medicine",
        required : true,
    },
    schedule : {
        type : Schema.Types.ObjectId,
        ref : "Schedule",
        required : true
    }
},{timestamps : true})

export const MedicineSchedule = mongoose.model("MedicineSchedule",medicineScheduleSchema)
