import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Shield, Eye, EyeOff, ArrowDown } from "lucide-react";

export interface PipelineStep {
  label: string;
  content: string;
  type: "original" | "desensitized" | "llm_response" | "reconstructed" | "info";
}

interface PrivacyDebugPanelProps {
  steps: PipelineStep[];
}

const stepColors: Record<PipelineStep["type"], string> = {
  original: "border-blue-500/30 bg-blue-500/5",
  desensitized: "border-amber-500/30 bg-amber-500/5",
  llm_response: "border-violet-500/30 bg-violet-500/5",
  reconstructed: "border-emerald-500/30 bg-emerald-500/5",
  info: "border-muted-foreground/20 bg-muted/30",
};

const stepBadgeColors: Record<PipelineStep["type"], string> = {
  original: "bg-blue-500/15 text-blue-400",
  desensitized: "bg-amber-500/15 text-amber-400",
  llm_response: "bg-violet-500/15 text-violet-400",
  reconstructed: "bg-emerald-500/15 text-emerald-400",
  info: "bg-muted text-muted-foreground",
};

const PrivacyDebugPanel = ({ steps }: PrivacyDebugPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!steps || steps.length === 0) return null;

  return (
    <div className="mt-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-500 transition-colors hover:bg-emerald-500/15"
      >
        <Shield className="h-3 w-3" />
        Privacy Pipeline
        <ChevronDown
          className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
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
            <div className="mt-2 space-y-1">
              {steps.map((step, i) => (
                <div key={i}>
                  <div
                    className={`rounded-lg border p-3 ${stepColors[step.type]}`}
                  >
                    <div className="mb-1.5 flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        {step.type === "desensitized" ? (
                          <EyeOff className="h-3 w-3 text-amber-400" />
                        ) : step.type === "reconstructed" ? (
                          <Eye className="h-3 w-3 text-emerald-400" />
                        ) : null}
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${stepBadgeColors[step.type]}`}
                        >
                          {step.label}
                        </span>
                      </span>
                    </div>
                    <pre className="whitespace-pre-wrap break-words text-xs leading-relaxed text-secondary-foreground/80 font-mono">
                      {step.content}
                    </pre>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="flex justify-center py-0.5">
                      <ArrowDown className="h-3 w-3 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PrivacyDebugPanel;
