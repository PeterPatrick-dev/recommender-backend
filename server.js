import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import Anthropic from '@anthropic-ai/sdk'

dotenv.config()

const app = express()
app.use(cors({ origin: process.env.CLIENT_URL }))
app.use(express.json())

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

app.post('/api/recommend', async (req, res) => {
  const answers = req.body

   // TEMPORARY MOCK — remove this block and uncomment the real Claude code below once credits are available
  const mockRecommendations = [
    { title: "The Night Circus", author: "Erin Morgenstern", reason: `Since you're drawn to a ${answers.world?.toLowerCase()} and want to feel ${answers.feeling?.toLowerCase()}, this dreamlike fantasy fits perfectly.`, genre: "Fantasy", mood: "Enchanting" },
    { title: "Project Hail Mary", author: "Andy Weir", reason: `Given your ${answers.vibe?.toLowerCase()} vibe right now, this fast-paced sci-fi adventure should hit the spot.`, genre: "Sci-Fi", mood: "Thrilling" },
    { title: "The House in the Cerulean Sea", author: "TJ Klune", reason: "A warm, comforting read that matches what you loved about your favorite story.", genre: "Fantasy", mood: "Cozy" },
    { title: "Piranesi", author: "Susanna Clarke", reason: "A quiet, reflective mystery that fits your current mood perfectly.", genre: "Mystery", mood: "Reflective" }
  ]
  return res.json({ recommendations: mockRecommendations })

  /* const prompt = `You are a thoughtful book recommendation expert. Based on the following user preferences, recommend exactly 4 books.

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
  } */ 
})

const PORT = 5000
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))