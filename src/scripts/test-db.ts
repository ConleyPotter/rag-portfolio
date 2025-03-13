import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function testConnection() {
  try {
    // Try to insert a test document
    const { data, error } = await supabase
      .from('documents')
      .insert({
        content: 'Test content',
        embedding: Array(1536).fill(0), // Create a zero vector for testing
        metadata: { test: true }
      })
      .select()

    if (error) throw error
    
    console.log('Successfully connected to Supabase and inserted test data!')
    console.log('Data:', data)

    // Clean up the test data
    await supabase
      .from('documents')
      .delete()
      .match({ metadata: { test: true } })

    console.log('Test data cleaned up successfully!')
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

testConnection() 