import mongoose,{Schema} from "mongoose"

const scheduleSchema = new mongoose.Schema({

  // AI generated  
  dayOfWeek: {
    type: String,
    enum: [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday'
    ],
    required: true
  },
  time: {
    type: String, // Use ISO 8601 time format, e.g., "08:30"
    required: true,
    validate: {
      validator: function (v) {
        return /^\d{2}:\d{2}$/.test(v); // Matches "HH:mm" format
      },
      message: props => `${props.value} is not a valid time format (HH:mm)!`
        }
    }
    },
{timestamps : true})

export const Schedule = mongoose.model("Schedule",scheduleSchema)
