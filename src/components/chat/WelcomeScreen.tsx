import { Shield } from "lucide-react";
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
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/12 ring-1 ring-primary/20"
      >
        <Shield className="h-8 w-8 text-primary" />
      </motion.div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-foreground">
        How can I help you?
      </h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Aegis AI — private, intelligent, always ready.
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
