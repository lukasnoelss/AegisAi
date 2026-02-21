import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const suggestions = [
  "Explain quantum computing in simple terms",
  "Write a Python script to sort a list",
  "What are the best practices for React?",
  "Help me write a professional email",
];

interface WelcomeScreenProps {
  onSuggestionClick: (text: string) => void;
}

const WelcomeScreen = ({ onSuggestionClick }: WelcomeScreenProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-1 flex-col items-center justify-center px-4"
    >
      <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15">
        <Sparkles className="h-8 w-8 text-primary" />
      </div>
      <h1 className="mb-2 text-2xl font-semibold text-foreground">
        How can I help you today?
      </h1>
      <p className="mb-8 text-sm text-muted-foreground">
        I'm here to assist with anything you need.
      </p>

      <div className="grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
        {suggestions.map((text) => (
          <button
            key={text}
            onClick={() => onSuggestionClick(text)}
            className="rounded-xl border border-border bg-secondary/50 px-4 py-3 text-left text-sm text-secondary-foreground transition-colors hover:bg-accent"
          >
            {text}
          </button>
        ))}
      </div>
    </motion.div>
  );
};

export default WelcomeScreen;
