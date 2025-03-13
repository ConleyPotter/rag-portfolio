import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs/promises'
import { ContentProcessor, ProcessedContent } from '../lib/content-processor'

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

async function processDirectory(dirPath: string, options: { sourceType: 'blog' | 'resume' | 'cover_letter' | 'general' }) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)
    
    if (entry.isDirectory()) {
      // Recursively process subdirectories
      await processDirectory(fullPath, options)
      continue
    }

    console.log(`Processing ${entry.name}...`)
    
    try {
      let processedContent: ProcessedContent[] = []
      const ext = path.extname(entry.name).toLowerCase()
      
      switch (ext) {
        case '.md':
          processedContent = await ContentProcessor.processMarkdown(fullPath, options)
          break
        case '.txt':
          processedContent = await ContentProcessor.processText(fullPath, options)
          break
        case '.html':
          processedContent = await ContentProcessor.processHTML(fullPath, options)
          break
        case '.json':
          if (options.sourceType === 'resume') {
            processedContent = await ContentProcessor.processResume(fullPath)
          }
          break
        default:
          console.log(`Skipping unsupported file type: ${ext}`)
          continue
      }

      // Generate embeddings and store in Supabase
      for (const content of processedContent) {
        const embedding = await generateEmbedding(content.content)
        
        const { error } = await supabase
          .from('documents')
          .insert({
            content: content.content,
            embedding,
            metadata: content.metadata
          })

        if (error) throw error
        console.log(`Ingested content from ${entry.name}: ${content.metadata.title || 'Untitled'}`)
      }
    } catch (error) {
      console.error(`Error processing ${entry.name}:`, error)
    }
  }
}

async function bulkIngest() {
  try {
    // Process different content types
    const contentTypes = [
      { path: 'content/blog', type: 'blog' as const },
      { path: 'content/resume', type: 'resume' as const },
      { path: 'content/cover-letters', type: 'cover_letter' as const },
      { path: 'content/general', type: 'general' as const }
    ]

    for (const { path: contentPath, type } of contentTypes) {
      const fullPath = path.join(process.cwd(), contentPath)
      
      try {
        await fs.access(fullPath)
        console.log(`Processing ${type} content from ${contentPath}...`)
        await processDirectory(fullPath, { sourceType: type })
      } catch (err: unknown) {
        if (err instanceof Error) {
          console.log(`Error accessing directory ${contentPath}: ${err.message}`)
        } else {
          console.log(`Directory ${contentPath} not found, skipping...`)
        }
      }
    }

    console.log('Bulk ingestion complete!')
  } catch (error) {
    console.error('Error during bulk ingestion:', error)
    process.exit(1)
  }
}

bulkIngest() 