import mongoose,{Schema} from "mongoose"

const medicineSchema = new Schema({
    patient : {
        type : Schema.Types.ObjectId,
        ref : "Patient",
        required : true
    },
    name : {
        type : String,
        required : true,
        index : true,
        unique : true
    },
    stock : {
        type: Number,
        required : true
    }
},{timestamps : true})

export const Medicine = mongoose.model("Medicine",medicineSchema)
