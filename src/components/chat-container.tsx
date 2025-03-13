import { cn } from "@/lib/utils"

interface ChatContainerProps {
  children: React.ReactNode
  className?: string
}

export function ChatContainer({ children, className }: ChatContainerProps) {
  return (
    <div className={cn("flex flex-col h-[calc(100vh-4rem)]", className)}>
      <div className="flex-1 overflow-y-auto">
        <div className="container max-w-3xl mx-auto p-4">
          {children}
        </div>
      </div>
    </div>
  )
} 