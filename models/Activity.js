import mongoose from 'mongoose'

const activitySchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: String, // stored as "YYYY-MM-DD"
    required: true,
  },
})

activitySchema.index({ owner: 1, date: 1 }, { unique: true })

const Activity = mongoose.model('Activity', activitySchema)

export default Activity