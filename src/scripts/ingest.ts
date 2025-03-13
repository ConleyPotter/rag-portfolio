import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// Load environment variables
dotenv.config({ path: '.env.local' })

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function generateEmbedding(text: string) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  })
  return response.data[0].embedding
}

async function ingestData() {
  try {
    // Read the professional info file
    const filePath = path.join(process.cwd(), 'data', 'professional_info.json')
    const rawData = fs.readFileSync(filePath, 'utf-8')
    const data = JSON.parse(rawData)

    // Process each section
    for (const section of data) {
      const embedding = await generateEmbedding(section.content)
      
      // Insert into Supabase
      const { error } = await supabase
        .from('documents')
        .insert({
          content: section.content,
          embedding,
          metadata: section.metadata || {},
        })

      if (error) throw error
      console.log(`Ingested section: ${section.metadata?.title || 'Untitled'}`)
    }

    console.log('Data ingestion complete!')
  } catch (error) {
    console.error('Error during ingestion:', error)
    process.exit(1)
  }
}

ingestData() 