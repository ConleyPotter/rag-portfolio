import { cn } from "@/lib/utils"
import { User, Bot } from "lucide-react"

interface MessageProps {
  message: string
  isUser?: boolean
  isLoading?: boolean
}

export function Message({ message, isUser = false, isLoading = false }: MessageProps) {
  return (
    <div
      className={cn(
        "flex w-full gap-3 mb-4",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center">
          <Bot className="w-4 h-4 text-neutral-600" />
        </div>
      )}
      <div
        className={cn(
          "flex max-w-[80%] flex-col gap-2 rounded-lg px-4 py-2 text-sm",
          isUser
            ? "bg-neutral-900 text-white"
            : "bg-neutral-100 text-neutral-900"
        )}
      >
        {isUser && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center">
              <User className="w-3 h-3 text-white" />
            </div>
            <span className="text-xs text-neutral-400">You</span>
          </div>
        )}
        <div className="prose prose-sm dark:prose-invert">
          {message}
        </div>
        {isLoading && (
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-neutral-400 animate-bounce" />
            <div className="w-2 h-2 rounded-full bg-neutral-400 animate-bounce [animation-delay:0.2s]" />
            <div className="w-2 h-2 rounded-full bg-neutral-400 animate-bounce [animation-delay:0.4s]" />
          </div>
        )}
      </div>
    </div>
  )
} 