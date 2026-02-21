import { Plus, MessageSquare, Trash2, Shield } from "lucide-react";
import { motion } from "framer-motion";
import type { Conversation } from "@/types/chat";
import type { User } from "firebase/auth";

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onDeleteAll: () => void;
  open: boolean;
  onClose: () => void;
  user: User | null;
  onLogout: () => void;
}

const Sidebar = ({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onDeleteAll,
  open,
  onClose,
  user,
  onLogout,
}: SidebarProps) => {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      <motion.aside
        initial={false}
        animate={{ x: open ? 0 : -300 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed left-0 top-0 z-50 flex h-full w-[260px] flex-col bg-sidebar-bg border-r border-sidebar-border md:relative md:z-auto md:translate-x-0"
        style={{ x: undefined }}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-4 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
            <Shield className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-bold tracking-tight text-foreground">Aegis AI</span>
        </div>

        <div className="flex flex-col gap-1 px-3 pb-1">
          <button
            onClick={onNew}
            className="flex w-full items-center gap-2 rounded-lg bg-primary/10 px-3 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
          >
            <Plus className="h-4 w-4" />
            New chat
          </button>
          
          {conversations.length > 0 && (
            <button
              onClick={onDeleteAll}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete all chats
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-2 scrollbar-thin">
          <p className="px-3 py-2 text-xs font-medium text-muted-foreground">
            Recent
          </p>
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => {
                onSelect(conv.id);
                onClose();
              }}
              className={`group flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                activeId === conv.id
                  ? "bg-sidebar-active text-foreground"
                  : "text-sidebar-fg hover:bg-sidebar-hover"
              }`}
            >
              <MessageSquare className="h-4 w-4 shrink-0 opacity-60" />
              <span className="flex-1 truncate">{conv.title}</span>
              <Trash2
                className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(conv.id);
                }}
              />
            </button>
          ))}
        </div>

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-sidebar-hover">
            <div className="flex items-center gap-2 overflow-hidden">
              {user?.photoURL ? (
                <img src={user.photoURL} className="h-7 w-7 rounded-full object-cover" alt="User" />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                  {user?.displayName?.[0] || user?.email?.[0] || "?"}
                </div>
              )}
              <span className="truncate text-sm text-sidebar-fg">{user?.displayName || "User"}</span>
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;
