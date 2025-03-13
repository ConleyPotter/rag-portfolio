import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { NextResponse } from 'next/server'

interface Document {
  content: string
  embedding: number[]
  metadata?: {
    title?: string
    type?: string
  }
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { message } = await req.json()

    console.log('Generating embedding for query:', message)
    
    // Generate embedding for the query
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: message,
    })

    console.log('Querying Supabase for relevant documents')
    
    // Get relevant context from the vector store
    const { data: documents, error: matchError } = await supabase.rpc('match_documents', {
      query_embedding: embedding.data[0].embedding,
      match_threshold: 0.6,
      match_count: 5,
    })

    if (matchError) {
      console.error('Error matching documents:', matchError)
      throw matchError
    }

    console.log('Found matching documents:', documents?.length || 0)

    // Prepare context from matched documents
    const context = documents
      ? documents.map((doc: Document) => {
          const title = doc.metadata?.title ? `[${doc.metadata.title}]: ` : ''
          return title + doc.content
        }).join('\n\n')
      : ''

    console.log('Generated context length:', context.length)

    // Create a streaming response
    const stream = new TransformStream()
    const writer = stream.writable.getWriter()
    const encoder = new TextEncoder()

    // Start the streaming response
    const response = new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

    // Generate streaming chat completion
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are Conley Potter's AI assistant, specifically designed to represent him and his professional experience.
          You should always speak in first person as if you are Conley.
          Use the following context from Conley's professional background to answer questions:
          
          ${context}
          
          If asked about experience, skills, or background, always refer to the context provided.
          If you don't find relevant information in the context, say "I don't have that specific information in my background, but I can tell you about..." and then mention something relevant from the context.
          Maintain a professional yet conversational tone.`,
        },
        { role: 'user', content: message },
      ],
      temperature: 0.7,
      stream: true,
    })

    // Process the stream
    ;(async () => {
      try {
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content || ''
          if (content) {
            await writer.write(encoder.encode(content))
          }
        }
        await writer.close()
      } catch (error) {
        console.error('Error in streaming:', error)
        await writer.write(encoder.encode('Sorry, there was an error processing your request.'))
        await writer.close()
      }
    })()

    return response
  } catch (error) {
    console.error('Error in chat API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 