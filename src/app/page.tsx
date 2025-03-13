'use client'

import { Message } from "@/components/message"
import { ChatInput } from "@/components/chat-input"
import { ChatContainer } from "@/components/chat-container"
import { useState, useRef, useEffect } from "react"

interface ChatMessage {
  content: string
  isUser: boolean
}

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (message: string) => {
    setIsLoading(true)
    // Add user message
    setMessages((prev) => [...prev, { content: message, isUser: true }])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader available')

      let aiMessage = ''
      setMessages((prev) => [...prev, { content: '', isUser: false }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = new TextDecoder().decode(value)
        aiMessage += chunk

        setMessages((prev) => {
          const newMessages = [...prev]
          newMessages[newMessages.length - 1] = { content: aiMessage, isUser: false }
          return newMessages
        })
      }
    } catch (error) {
      console.error('Error:', error)
      setMessages((prev) => [
        ...prev,
        { content: "Sorry, I couldn't process your request.", isUser: false },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col">
      <ChatContainer>
        <div className="space-y-4">
          {messages.map((message, index) => (
            <Message
              key={index}
              message={message.content}
              isUser={message.isUser}
              isLoading={isLoading && index === messages.length - 1 && !message.isUser}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ChatContainer>
      <ChatInput onSubmit={handleSubmit} disabled={isLoading} />
    </main>
  )
}
