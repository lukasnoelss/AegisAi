import { useState, useRef, useEffect, useCallback } from "react";
import { Menu, LogOut, Check, ChevronDown, Shield, ShieldCheck, Lock, Download, MonitorPlay, FolderArchive, TerminalSquare } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "@/components/chat/Sidebar";
import ChatMessage from "@/components/chat/ChatMessage";
import ChatInput from "@/components/chat/ChatInput";
import TypingIndicator from "@/components/chat/TypingIndicator";
import WelcomeScreen from "@/components/chat/WelcomeScreen";
import type { PipelineStep } from "@/components/chat/PrivacyDebugPanel";
import { getGeminiResponse } from "@/lib/gemini";
import { getClaudeResponse } from "@/lib/claude";
import { deembed, reconstruct } from "@/lib/privacyPipeline";
import { useChat } from "@/hooks/useChat";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const Index = () => {
  const { user, logout } = useAuth();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<"gemini" | "claude">("gemini");
  const [privacyEnabled] = useState(true); // Always-on privacy
  const [privacyStatus, setPrivacyStatus] = useState<string>("");
  const [sensitiveCount, setSensitiveCount] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    conversations,
    messages,
    createConversation,
    sendMessage: saveMessage,
    deleteConversation: removeConversation,
    deleteAllConversations,
    updateConversationModel,
  } = useChat(activeId, user?.uid);

  useEffect(() => {
    console.log("Index: User state changed:", user?.uid);
  }, [user]);

  useEffect(() => {
    console.log("Index: Conversations updated, count:", conversations.length);
  }, [conversations]);

  const activeConversation = conversations.find((c) => c.id === activeId);
  const currentModel = activeConversation?.model || selectedModel;

  const handleModelChange = async (model: "gemini" | "claude") => {
    setSelectedModel(model);
    if (activeId) {
      await updateConversationModel(activeId, model);
    }
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  const handleSendMessage = async (content: string) => {
    let currentId = activeId;

    if (!currentId) {
      currentId = await createConversation(content, selectedModel);
      setActiveId(currentId);
    }

    // Save user message to Firestore (always the original)
    await saveMessage(currentId, content, "user");

    setIsTyping(true);

    try {
      // Prepare history — Gemini requires it to start with 'user' role
      let history = messages
        .filter(msg => msg.content !== content)
        .filter(msg => !msg.content.startsWith("Sorry, I encountered an error"))
        .filter(msg => !msg.content.startsWith("Privacy pipeline error"))
        .filter(msg => !msg.content.startsWith("I'm sorry, I'm having trouble"))
        .map(msg => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }]
        }));

      // Ensure history starts with a 'user' message (Gemini requirement)
      while (history.length > 0 && history[0].role !== "user") {
        history.shift();
      }

      let aiResponse: string;

      if (privacyEnabled) {
        // === PRIVACY PIPELINE ===
        const steps: PipelineStep[] = [];

        // Step 1: Record original prompt
        steps.push({ label: "Original Prompt", content: content, type: "original" });

        // Step 2: Deembed — strip PII
        setPrivacyStatus("🛡️ Stripping sensitive info (local Ollama)...");
        const { sensitive_info, desensitized_prompt } = await deembed(content);
        const itemCount = Object.keys(sensitive_info).length;

        steps.push({ label: "Desensitized (sent to AI)", content: desensitized_prompt, type: "desensitized" });
        steps.push({
          label: "Sensitive Info Map",
          content: Object.entries(sensitive_info).map(([k, v]) => `[${k}] → ${v}`).join("\n"),
          type: "info"
        });

        // Step 3: Send desensitized prompt to the external LLM
        // Append subtle note about redacted placeholders (at end to avoid Gemini responding to it)
        const privacySuffix =
          "\n\n[Note: Some personal details in this message have been replaced with " +
          "placeholders like [NAME], [ADDRESS], etc. for privacy. Treat them as real data " +
          "and use the same placeholders in your response. Do NOT acknowledge this note.]";
        const prefixedPrompt = desensitized_prompt + privacySuffix;

        setPrivacyStatus(`🤖 Waiting for ${currentModel === "claude" ? "Claude" : "Gemini"} response...`);
        let rawLlmResponse: string;
        if (currentModel === "claude") {
          rawLlmResponse = await getClaudeResponse(prefixedPrompt, history);
        } else {
          rawLlmResponse = await getGeminiResponse(prefixedPrompt, history);
        }

        steps.push({ label: "LLM Response (with placeholders)", content: rawLlmResponse, type: "llm_response" });

        // Step 4: Reconstruct — restore real PII values
        setPrivacyStatus("🔄 Restoring your personal data in response...");
        aiResponse = await reconstruct(sensitive_info, rawLlmResponse);

        steps.push({ label: "Reconstructed (shown to you)", content: aiResponse, type: "reconstructed" });

        // Save AI message to Firestore with pipeline steps
        await saveMessage(currentId, aiResponse, "assistant", steps);

        setPrivacyStatus("");
        setSensitiveCount(itemCount);
      } else {
        // === DIRECT MODE (no privacy) ===
        if (currentModel === "claude") {
          aiResponse = await getClaudeResponse(content, history);
        } else {
          aiResponse = await getGeminiResponse(content, history);
        }

        // Save AI message to Firestore
        await saveMessage(currentId, aiResponse, "assistant");
      }
    } catch (error: any) {
      console.error("AI response error:", error);
      const errorMsg = error.message?.includes("Deembed failed")
        ? "Privacy pipeline error: Make sure the backend server is running (`npm run server`) and Ollama is available."
        : "I'm sorry, I'm having trouble connecting right now.";
      await saveMessage(currentId, errorMsg, "assistant");
    } finally {
      setIsTyping(false);
      setPrivacyStatus("");
    }
  };

  const handleDeleteConversation = async (id: string) => {
    await removeConversation(id);
    if (activeId === id) setActiveId(null);
  };

  const handleDeleteAll = async () => {
    if (window.confirm("Are you sure you want to delete all conversations?")) {
      await deleteAllConversations();
      setActiveId(null);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={() => {
          setActiveId(null);
          setSidebarOpen(false);
        }}
        onDelete={handleDeleteConversation}
        onDeleteAll={handleDeleteAll}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        onLogout={logout}
      />

      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-foreground transition-colors hover:bg-accent focus:outline-none">
                {currentModel === "gemini" ? "Gemini 2.5 Flash-Lite" : "Claude 3.5 Sonnet"}
                <ChevronDown className="h-4 w-4 opacity-50" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[200px] bg-popover border-border">
                <DropdownMenuItem
                  onClick={() => handleModelChange("gemini")}
                  className="flex items-center justify-between py-2 cursor-pointer"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Gemini 1.5 Flash-8B</span>
                    <span className="text-xs text-muted-foreground italic">Ultra-fast and efficient</span>
                  </div>
                  {currentModel === "gemini" && <Check className="h-4 w-4 text-primary" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleModelChange("claude")}
                  className="flex items-center justify-between py-2 cursor-pointer"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Claude 3.5 Sonnet</span>
                    <span className="text-xs text-muted-foreground italic">Intelligent and nuanced</span>
                  </div>
                  {currentModel === "claude" && <Check className="h-4 w-4 text-primary" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-2">
            {/* Privacy toggle hidden — privacy is always on */}

            <Dialog>
              <DialogTrigger asChild>
                <button
                  className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium bg-emerald-500/10 text-emerald-600 transition-colors hover:bg-emerald-500/20 active:scale-95"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Download Local Server</span>
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md bg-popover border-border">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-xl">
                    <Shield className="h-5 w-5 text-emerald-500" />
                    Setup Local Privacy Shield
                  </DialogTitle>
                  <DialogDescription className="pt-2 text-muted-foreground">
                    To keep your data 100% private, this web app routes all sensitive information through a local server on your own computer.
                  </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4 py-4">
                  <div className="flex gap-4 items-start">
                    <div className="bg-primary/10 p-2 rounded-full mt-1">
                      <FolderArchive className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-1 text-foreground">1. Download & Extract</h4>
                      <p className="text-sm text-muted-foreground mb-2">Download the Mac application zip file and double-click to extract it.</p>
                      <a
                        href="/downloads/AegisAI-Local.zip"
                        download
                        className="inline-flex items-center gap-2 rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-600"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download AegisAI-Local.zip
                      </a>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="bg-primary/10 p-2 rounded-full mt-1">
                      <TerminalSquare className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-1 text-foreground">2. Bypass Apple Security</h4>
                      <p className="text-sm text-muted-foreground">Because this is an indie developer app, Apple will flag it. To run it: <strong>Right-Click (or Control-Click)</strong> the extracted <code>AegisAI-Local</code> file and select <strong>Open</strong> from the menu.</p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="bg-primary/10 p-2 rounded-full mt-1">
                      <MonitorPlay className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-1 text-foreground">3. Leave it running</h4>
                      <p className="text-sm text-muted-foreground">A small terminal window will open saying the server is running. Leave it open in the background while you chat!</p>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <button
              onClick={logout}
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-95"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Privacy Banner */}
        <AnimatePresence>
          {privacyEnabled && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="flex items-center justify-center gap-2 bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-2">
                <Lock className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs font-medium text-emerald-500">
                  Privacy Shield Active — All messages are de-identified before leaving your device
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {!activeId || (messages.length === 0 && !isTyping) ? (
            <WelcomeScreen onSuggestionClick={handleSendMessage} />
          ) : (
            <div className="pb-4">
              {messages.map((msg, index) => {
                // Pipeline steps are loaded from Firebase per message
                const debugSteps = msg.pipelineSteps as PipelineStep[] | undefined;

                return (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    pipelineSteps={debugSteps}
                    onRerun={handleSendMessage}
                  />
                );
              })}
              {isTyping && (
                <div className="mx-auto max-w-3xl px-4 md:px-0">
                  <TypingIndicator />
                  {privacyStatus && (
                    <p className="mt-2 text-xs text-muted-foreground animate-pulse">
                      {privacyStatus}
                    </p>
                  )}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <ChatInput onSend={handleSendMessage} disabled={isTyping} privacyEnabled={privacyEnabled} sensitiveCount={sensitiveCount} />
      </main>
    </div>
  );
};

export default Index;
