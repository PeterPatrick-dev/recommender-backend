import mongoose from 'mongoose'

const recommendationSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  answers: {
    type: Object,
    required: true,
  },
  recommendations: {
    type: Array,
    required: true,
  },
}, { timestamps: true })

const Recommendation = mongoose.model('Recommendation', recommendationSchema)

export default Recommendation