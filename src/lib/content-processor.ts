import { read } from 'to-vfile'
import path from 'path'
import fs from 'fs/promises'

export interface ProcessedContent {
  content: string
  metadata: {
    title?: string
    type: string
    source: string
    date?: string
    category?: string
  }
}

interface ProcessingOptions {
  chunkSize?: number
  overlapSize?: number
  sourceType: 'blog' | 'resume' | 'cover_letter' | 'general'
  category?: string
}

interface ResumeJob {
  position: string
  company: string
  startDate: string
  endDate: string
  summary: string
  highlights?: string[]
}

type Metadata = {
  title?: string
  type: string
  source: string
  date?: string
  category?: string
}

export class ContentProcessor {
  private static readonly DEFAULT_CHUNK_SIZE = 1000
  private static readonly DEFAULT_OVERLAP_SIZE = 100

  /**
   * Process markdown content
   */
  static async processMarkdown(filePath: string, options: ProcessingOptions): Promise<ProcessedContent[]> {
    const file = await read(filePath)
    const content = String(file)
    
    // Parse frontmatter if it exists
    const frontmatter = this.extractFrontmatter(content)
    const cleanContent = this.removeFrontmatter(content)

    // Process the content into chunks
    return this.chunkContent(cleanContent, {
      ...options,
      metadata: {
        ...frontmatter,
        source: path.basename(filePath),
        type: options.sourceType
      }
    })
  }

  /**
   * Process plain text content (like cover letters)
   */
  static async processText(filePath: string, options: ProcessingOptions): Promise<ProcessedContent[]> {
    const content = await fs.readFile(filePath, 'utf-8')
    
    return this.chunkContent(content, {
      ...options,
      metadata: {
        title: path.basename(filePath, path.extname(filePath)),
        source: path.basename(filePath),
        type: options.sourceType
      }
    })
  }

  /**
   * Process HTML content
   */
  static async processHTML(filePath: string, options: ProcessingOptions): Promise<ProcessedContent[]> {
    const content = await fs.readFile(filePath, 'utf-8')
    const plainText = this.stripHTML(content)
    
    return this.chunkContent(plainText, {
      ...options,
      metadata: {
        title: this.extractHTMLTitle(content),
        source: path.basename(filePath),
        type: options.sourceType
      }
    })
  }

  /**
   * Process a resume (assuming JSON format)
   */
  static async processResume(filePath: string): Promise<ProcessedContent[]> {
    const content = await fs.readFile(filePath, 'utf-8')
    const resume = JSON.parse(content)
    const processed: ProcessedContent[] = []

    // Process each section of the resume
    if (resume.basics) {
      processed.push({
        content: `${resume.basics.summary || ''}`,
        metadata: {
          title: 'Professional Summary',
          type: 'resume',
          source: path.basename(filePath),
          category: 'summary'
        }
      })
    }

    if (resume.work) {
      resume.work.forEach((job: ResumeJob) => {
        processed.push({
          content: `Position: ${job.position}\nCompany: ${job.company}\nDuration: ${job.startDate} - ${job.endDate}\n${job.summary}\n${job.highlights?.join('\n')}`,
          metadata: {
            title: `Work Experience - ${job.company}`,
            type: 'resume',
            source: path.basename(filePath),
            category: 'experience'
          }
        })
      })
    }

    // Add other resume sections as needed
    return processed
  }

  /**
   * Chunk content into smaller pieces with overlap
   */
  private static async chunkContent(
    content: string,
    options: ProcessingOptions & { metadata: Metadata }
  ): Promise<ProcessedContent[]> {
    const chunkSize = options.chunkSize || this.DEFAULT_CHUNK_SIZE
    const overlapSize = options.overlapSize || this.DEFAULT_OVERLAP_SIZE
    const chunks: ProcessedContent[] = []
    
    // Split content into sentences
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [content]
    let currentChunk = ''
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i]
      
      // If adding this sentence would exceed chunk size
      if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
        // Add the current chunk to our chunks array
        chunks.push({
          content: currentChunk.trim(),
          metadata: options.metadata
        })
        
        // Start new chunk with overlap, but only if we're not at the end
        // and only include complete sentences in the overlap
        if (i < sentences.length - 1) {
          // Find the last few sentences that fit within overlap size
          let overlapText = ''
          let j = chunks.length - 1
          while (overlapText.length < overlapSize && j >= 0) {
            const potentialOverlap = sentences[j] + overlapText
            if (potentialOverlap.length <= overlapSize) {
              overlapText = potentialOverlap
              j--
            } else {
              break
            }
          }
          currentChunk = overlapText + sentence
        } else {
          currentChunk = sentence
        }
      } else {
        currentChunk += sentence
      }
    }
    
    // Add the final chunk if there's anything left
    if (currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        metadata: options.metadata
      })
    }
    
    return chunks
  }

  private static extractFrontmatter(content: string): Partial<Metadata> {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/
    const match = content.match(frontmatterRegex)
    if (!match) return {}
    
    try {
      const lines = match[1].split('\n')
      const frontmatter: Partial<Metadata> = {}
      
      for (const line of lines) {
        const [key, ...valueParts] = line.split(':')
        const validKey = key?.trim() as keyof Metadata
        if (validKey && valueParts.length > 0) {
          frontmatter[validKey] = valueParts.join(':').trim()
        }
      }
      
      return frontmatter
    } catch (error) {
      console.error('Error parsing frontmatter:', error)
      return {}
    }
  }

  private static removeFrontmatter(content: string): string {
    return content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '')
  }

  private static stripHTML(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  }

  private static extractHTMLTitle(html: string): string | undefined {
    const match = html.match(/<title>(.*?)<\/title>/)
    return match ? match[1] : undefined
  }
} 