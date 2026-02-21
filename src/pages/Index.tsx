import { useState, useRef, useEffect, useCallback } from "react";
import { Menu, LogOut } from "lucide-react";
import Sidebar from "@/components/chat/Sidebar";
import ChatMessage from "@/components/chat/ChatMessage";
import ChatInput from "@/components/chat/ChatInput";
import TypingIndicator from "@/components/chat/TypingIndicator";
import WelcomeScreen from "@/components/chat/WelcomeScreen";
import { getGeminiResponse } from "@/lib/gemini";
import { useChat } from "@/hooks/useChat";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { user, logout } = useAuth();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    conversations,
    messages,
    createConversation,
    sendMessage: saveMessage,
    deleteConversation: removeConversation,
  } = useChat(activeId, user?.uid);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  const handleSendMessage = async (content: string) => {
    let currentId = activeId;

    if (!currentId) {
      currentId = await createConversation(content);
      setActiveId(currentId);
    }

    // Save user message to Firestore
    await saveMessage(currentId, content, "user");

    setIsTyping(true);

    try {
      // Prepare history for Gemini - exclude the message we just sent if it's already in the messages array
      const history = messages
        .filter(msg => msg.content !== content)
        .map(msg => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }]
        }));

      // Get real AI response
      const aiResponse = await getGeminiResponse(content, history);

      // Save AI message to Firestore
      await saveMessage(currentId, aiResponse, "assistant");
    } catch (error) {
      console.error("AI response error:", error);
      await saveMessage(currentId, "I'm sorry, I'm having trouble connecting right now.", "assistant");
    } finally {
      setIsTyping(false);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    await removeConversation(id);
    if (activeId === id) setActiveId(null);
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
            <h2 className="text-sm font-medium text-foreground">Chatty</h2>
          </div>
          
          <button 
            onClick={logout}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-95"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </header>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {!activeId || (messages.length === 0 && !isTyping) ? (
            <WelcomeScreen onSuggestionClick={handleSendMessage} />
          ) : (
            <div className="pb-4">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {isTyping && (
                <div className="mx-auto max-w-3xl px-4 md:px-0">
                  <TypingIndicator />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <ChatInput onSend={handleSendMessage} disabled={isTyping} />
      </main>
    </div>
  );
};

export default Index;
