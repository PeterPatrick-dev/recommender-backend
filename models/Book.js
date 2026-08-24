import mongoose from 'mongoose'

const bookSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  author: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    default: "Uncategorized",
  },
  status: {
    type: String,
    enum: ["Want to Read", "Reading", "Completed"],
    default: "Want to Read",
  },
  currentPage: {
    type: Number,
    default: 0,
  },
  totalPages: {
    type: Number,
    default: 0,
  },
}, { timestamps: true })

const Book = mongoose.model('Book', bookSchema)

export default Book