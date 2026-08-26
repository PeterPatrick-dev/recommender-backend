import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import Anthropic from '@anthropic-ai/sdk'
import mongoose from 'mongoose'
import User from './models/User.js'
import jwt from 'jsonwebtoken'
import Book from './models/Book.js'
import auth from './middleware/auth.js'
import Recommendation from './models/Recommendation.js'
import Activity from './models/Activity.js'

dotenv.config()

const app = express()
app.use(cors({ origin: process.env.CLIENT_URL }))
app.use(express.json())

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err))

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists' })
    }

    const user = new User({ name, email, password })
    await user.save()

    res.status(201).json({
      message: 'Account created successfully',
      user: { id: user._id, name: user.name, email: user.email }
    })
  } catch (error) {
    console.error('Signup error:', error)
    res.status(500).json({ error: 'Something went wrong creating your account' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' })
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' })
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, name: user.name, email: user.email }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Something went wrong logging in' })
  }
})

app.post('/api/recommend', async (req, res) => {
  const answers = req.body

  // TEMPORARY MOCK — remove this block and uncomment the real Claude code below once credits are available
  const mockRecommendations = [
    { title: "The Night Circus", author: "Erin Morgenstern", reason: `Since you're drawn to a ${answers.world?.toLowerCase()} and want to feel ${answers.feeling?.toLowerCase()}, this dreamlike fantasy fits perfectly.`, genre: "Fantasy", mood: "Enchanting" },
    { title: "Project Hail Mary", author: "Andy Weir", reason: `Given your ${answers.vibe?.toLowerCase()} vibe right now, this fast-paced sci-fi adventure should hit the spot.`, genre: "Sci-Fi", mood: "Thrilling" },
    { title: "The House in the Cerulean Sea", author: "TJ Klune", reason: "A warm, comforting read that matches what you loved about your favorite story.", genre: "Fantasy", mood: "Cozy" },
    { title: "Piranesi", author: "Susanna Clarke", reason: "A quiet, reflective mystery that fits your current mood perfectly.", genre: "Mystery", mood: "Reflective" }
  ]

  // If the request has a valid token, save this session to the user's history
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1]
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      await Recommendation.create({
        owner: decoded.userId,
        answers,
        recommendations: mockRecommendations,
      })
    } catch (err) {
      console.error('Could not save recommendation history:', err.message)
    }
  }

  return res.json({ recommendations: mockRecommendations })

  /* REAL CLAUDE CODE — uncomment this once you have API credits, and delete/comment the mock block above
  const prompt = `You are a thoughtful book recommendation expert. Based on the following user preferences, recommend exactly 4 books.

User preferences:
- Desired world/setting: ${answers.world}
- Desired feeling after reading: ${answers.feeling}
- Time commitment: ${answers.time}
- Something they loved and why: ${answers.loved}
- Current vibe: ${answers.vibe}
- Wants to avoid: ${answers.avoid || "nothing specified"}

Respond with ONLY a valid JSON array, no other text, no markdown code fences. Each item in the array must have exactly these fields:
- "title": the book title
- "author": the author's name
- "reason": a 1-2 sentence personalized reason referencing the user's actual answers
- "genre": a short genre tag
- "mood": a short mood tag

Example format:
[{"title": "...", "author": "...", "reason": "...", "genre": "...", "mood": "..."}]`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    })

    const rawText = message.content[0].text
    const recommendations = JSON.parse(rawText)

    res.json({ recommendations })
  } catch (error) {
    console.error('Error getting recommendations:', error)
    res.status(500).json({ error: 'Failed to get recommendations' })
  }
  */
})

app.get('/api/recommendations/history', auth, async (req, res) => {
  try {
    const history = await Recommendation.find({ owner: req.userId }).sort({ createdAt: -1 })
    res.json(history)
  } catch (error) {
    console.error('Get history error:', error)
    res.status(500).json({ error: 'Something went wrong fetching your history' })
  }
})
app.post('/api/books', auth, async (req, res) => {
  try {
    const { title, author, category, status, totalPages } = req.body

    const book = new Book({
      owner: req.userId,
      title,
      author,
      category,
      status,
      totalPages,
    })
    await book.save()
    res.status(201).json(book)
  } catch (error) {
    console.error('Add book error:', error)
    res.status(500).json({ error: 'Something went wrong adding the book' })
  }
})

app.get('/api/books', auth, async (req, res) => {
  try {
    const books = await Book.find({ owner: req.userId }).sort({ createdAt: -1 })
    res.json(books)
  } catch (error) {
    console.error('Get library error:', error)
    res.status(500).json({ error: 'Something went wrong fetching your library' })
  }
})

app.delete('/api/books/:id', auth, async (req, res) => {
  try {
    const book = await Book.findOneAndDelete({ _id: req.params.id, owner: req.userId })

    if (!book) {
      return res.status(404).json({ error: 'Book not found' })
    }

    res.json({ message: 'Book removed' })
  } catch (error) {
    console.error('Delete book error:', error)
    res.status(500).json({ error: 'Something went wrong removing the book' })
  }
})

app.patch('/api/books/:id', auth, async (req, res) => {
  try {
    const book = await Book.findOneAndUpdate(
      { _id: req.params.id, owner: req.userId },
      { $set: req.body },
      { new: true }
    )

    if (!book) {
      return res.status(404).json({ error: 'Book not found' })
    }

    res.json(book)
  } catch (error) {
    console.error('Update book error:', error)
    res.status(500).json({ error: 'Something went wrong updating the book' })
  }
})

app.get('/api/books/reading', auth, async (req, res) => {
  try {
    const books = await Book.find({ owner: req.userId, status: "Reading" }).sort({ updatedAt: -1 })
    res.json(books)
  } catch (error) {
    console.error('Get reading list error:', error)
    res.status(500).json({ error: 'Something went wrong fetching your reading list' })
  }
})

app.patch('/api/books/:id/progress', auth, async (req, res) => {
  try {
    const { currentPage } = req.body

    const book = await Book.findOneAndUpdate(
      { _id: req.params.id, owner: req.userId },
      { $set: { currentPage } },
      { new: true }
    )

    if (!book) {
      return res.status(404).json({ error: 'Book not found' })
    }

     // Log today as an active reading day (upsert = create if missing, ignore if it exists)
    const today = new Date().toISOString().split('T')[0]
    await Activity.findOneAndUpdate(
      { owner: req.userId, date: today },
      { owner: req.userId, date: today },
      { upsert: true }
    )

    res.json(book)
  } catch (error) {
    console.error('Update progress error:', error)
    res.status(500).json({ error: 'Something went wrong updating progress' })
  }
})

const PORT = 5000
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))

app.get('/api/notifications', auth, async (req, res) => {
  try {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)

    //the next line is for testing purposes only, to simulate a book that hasn't been updated in 10 seconds
    /*const threeDaysAgo = new Date(Date.now() - 10 * 1000)*/
    
    const staleBooks = await Book.find({
      owner: req.userId,
      status: "Reading",
      updatedAt: { $lt: threeDaysAgo }
    })

    const notifications = staleBooks.map((book) => ({
      id: book._id,
      message: `You haven't opened "${book.title}" in a while — pick it back up?`
    }))

    res.json({ notifications })
  } catch (error) {
    console.error('Get notifications error:', error)
    res.status(500).json({ error: 'Something went wrong fetching notifications' })
  }
})

app.get('/api/analytics', auth, async (req, res) => {
  try {
    const books = await Book.find({ owner: req.userId })

    const booksCompleted = books.filter((b) => b.status === "Completed").length

    const totalPagesRead = books.reduce((sum, book) => {
      if (book.status === "Completed") return sum + (book.totalPages || 0)
      return sum + (book.currentPage || 0)
    }, 0)

    const genreCounts = {}
    books.forEach((book) => {
      const genre = book.category || "Uncategorized"
      genreCounts[genre] = (genreCounts[genre] || 0) + 1
    })
    const favoriteGenre = Object.keys(genreCounts).length > 0
      ? Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0][0]
      : "None yet"

    // Calculate current streak: count consecutive days backward from today with activity
    const activities = await Activity.find({ owner: req.userId })
    const activeDates = new Set(activities.map((a) => a.date))

    let streak = 0
    let checkDate = new Date()
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0]
      if (activeDates.has(dateStr)) {
        streak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }

    res.json({
      booksCompleted,
      totalPagesRead,
      favoriteGenre,
      totalBooks: books.length,
      currentStreak: streak,
    })
  } catch (error) {
    console.error('Get analytics error:', error)
    res.status(500).json({ error: 'Something went wrong fetching analytics' })
  }
})