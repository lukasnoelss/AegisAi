import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Shield, Eye, EyeOff, Bot, FileText, Info } from "lucide-react";

export interface PipelineStep {
  label: string;
  content: string;
  type: "original" | "desensitized" | "llm_response" | "reconstructed" | "info";
}

interface PrivacyDebugPanelProps {
  steps: PipelineStep[];
}

const stepIcons: Record<PipelineStep["type"], React.ReactNode> = {
  original: <FileText className="h-3.5 w-3.5" />,
  desensitized: <EyeOff className="h-3.5 w-3.5" />,
  llm_response: <Bot className="h-3.5 w-3.5" />,
  reconstructed: <Eye className="h-3.5 w-3.5" />,
  info: <Info className="h-3.5 w-3.5" />,
};

const stepAccent: Record<PipelineStep["type"], string> = {
  original: "text-blue-400",
  desensitized: "text-amber-400",
  llm_response: "text-violet-400",
  reconstructed: "text-emerald-400",
  info: "text-muted-foreground",
};

const PrivacyDebugPanel = ({ steps }: PrivacyDebugPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  if (!steps || steps.length === 0) return null;

  return (
    <div className="mt-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-lg bg-primary/8 px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/14"
      >
        <Shield className="h-3 w-3" />
        Privacy Pipeline
        <ChevronRight
          className={`h-3 w-3 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 rounded-xl border border-border bg-card/50 p-1">
              {steps.map((step, i) => {
                const isExpanded = expandedStep === i;
                return (
                  <button
                    key={i}
                    onClick={() => setExpandedStep(isExpanded ? null : i)}
                    className="w-full text-left"
                  >
                    <div
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors ${
                        isExpanded ? "bg-accent" : "hover:bg-accent/50"
                      }`}
                    >
                      <span className={stepAccent[step.type]}>
                        {stepIcons[step.type]}
                      </span>
                      <span className="flex-1 truncate text-xs font-medium text-foreground">
                        {step.label}
                      </span>
                      <ChevronRight
                        className={`h-3 w-3 text-muted-foreground transition-transform duration-200 ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                      />
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden"
                        >
                          <pre className="mx-3 mb-2 mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-background p-3 text-[11px] leading-relaxed text-secondary-foreground/80 font-mono scrollbar-thin">
                            {step.content}
                          </pre>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PrivacyDebugPanel;
