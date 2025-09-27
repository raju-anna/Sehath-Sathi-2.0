import mongoose,{Schema} from "mongoose"

const patientSchema = new Schema({
    caretaker : {
        type : Schema.Types.ObjectId,
        ref : "User",
        required : true
    },
    fullName : {
        type : String,
        required : true,
        trim : true,
        index : true
    },
    medicineSchedule : [{
        type : Schema.Types.ObjectId,
        ref : "MedicineSchedule"
    }],
},{timestamps : true})

export const Patient = mongoose.model("Patient",patientSchema)

