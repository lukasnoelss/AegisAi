import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import { User, Sparkles } from "lucide-react";
import type { Message } from "@/types/chat";

interface ChatMessageProps {
  message: Message;
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="group px-4 py-6 md:px-0"
    >
      <div className="mx-auto flex max-w-3xl gap-4">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
            isUser ? "bg-chat-user" : "bg-primary/15"
          }`}
        >
          {isUser ? (
            <User className="h-4 w-4 text-foreground" />
          ) : (
            <Sparkles className="h-4 w-4 text-primary" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-sm font-medium text-foreground">
            {isUser ? "You" : "ChatGPT"}
          </p>
          <div className="prose prose-invert prose-sm max-w-none text-secondary-foreground">
            <ReactMarkdown
              components={{
                code: ({ className, children, ...props }) => {
                  const isInline = !className;
                  if (isInline) {
                    return (
                      <code
                        className="rounded bg-muted px-1.5 py-0.5 text-sm text-primary"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  }
                  return (
                    <div className="my-3 overflow-hidden rounded-lg border border-border">
                      <div className="flex items-center justify-between bg-muted px-4 py-2">
                        <span className="text-xs text-muted-foreground">
                          {className?.replace("language-", "") || "code"}
                        </span>
                      </div>
                      <pre className="overflow-x-auto bg-background p-4">
                        <code className="text-sm text-foreground" {...props}>
                          {children}
                        </code>
                      </pre>
                    </div>
                  );
                },
                p: ({ children }) => (
                  <p className="mb-3 leading-7 text-secondary-foreground last:mb-0">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="mb-3 list-disc pl-6 text-secondary-foreground">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-3 list-decimal pl-6 text-secondary-foreground">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="mb-1 text-secondary-foreground">{children}</li>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="my-3 border-l-2 border-primary/40 pl-4 italic text-muted-foreground">
                    {children}
                  </blockquote>
                ),
                h3: ({ children }) => (
                  <h3 className="mb-2 mt-4 text-base font-semibold text-foreground">
                    {children}
                  </h3>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-foreground">
                    {children}
                  </strong>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ChatMessage;
