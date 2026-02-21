import { useState, useRef, useEffect } from "react";
import { ArrowUp } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  privacyEnabled?: boolean;
  sensitiveCount?: number | null;
}

const ChatInput = ({ onSend, disabled, privacyEnabled, sensitiveCount }: ChatInputProps) => {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [value]);

  const handleSubmit = () => {
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-4">
      <div className={`relative rounded-2xl border shadow-lg transition-colors duration-300 ${privacyEnabled
        ? "border-emerald-500/60 bg-secondary ring-1 ring-emerald-500/20"
        : "border-border bg-secondary"
        }`}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={privacyEnabled ? "🔒 Encrypted Input Channel..." : "Message Aegis AI..."}
          disabled={disabled}
          rows={1}
          className="w-full resize-none bg-transparent px-4 py-3.5 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 scrollbar-thin"
        />
        <button
          onClick={handleSubmit}
          disabled={!value.trim() || disabled}
          className="absolute bottom-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background transition-opacity hover:opacity-80 disabled:opacity-30"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </div>
      {sensitiveCount != null && sensitiveCount > 0 ? (
        <p className="mt-2 text-center text-xs text-emerald-400/80">
          🛡️ {sensitiveCount} sensitive {sensitiveCount === 1 ? 'item' : 'items'} detected and protected
        </p>
      ) : (
        <p className="mt-2 text-center text-xs text-emerald-400/50">
          🛡️ Privacy Shield Active
        </p>
      )}
    </div>
  );
};

export default ChatInput;
