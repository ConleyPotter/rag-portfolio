import { Button } from "@/components/ui/button"
import { Send } from "lucide-react"
import { useState, useRef, useEffect } from "react"

interface ChatInputProps {
  onSubmit: (message: string) => void
  disabled?: boolean
}

export function ChatInput({ onSubmit, disabled }: ChatInputProps) {
  const [input, setInput] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || disabled) return
    onSubmit(input)
    setInput("")
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [input])

  return (
    <form onSubmit={handleSubmit} className="border-t bg-white dark:bg-neutral-900">
      <div className="container max-w-3xl mx-auto p-4">
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about my professional experience..."
            className="flex-1 min-h-[44px] max-h-[200px] px-4 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 resize-none"
            disabled={disabled}
          />
          <Button 
            type="submit" 
            disabled={disabled || !input.trim()}
            size="icon"
            className="shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </form>
  )
} 