import { Plus, MessageSquare, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import type { Conversation } from "@/types/chat";

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  open: boolean;
  onClose: () => void;
}

const Sidebar = ({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  open,
  onClose,
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
        <div className="flex items-center justify-between p-3">
          <button
            onClick={onNew}
            className="flex flex-1 items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-sidebar-fg transition-colors hover:bg-sidebar-hover"
          >
            <Plus className="h-4 w-4" />
            New chat
          </button>
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
          <div className="flex items-center gap-2 rounded-lg px-3 py-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              U
            </div>
            <span className="text-sm text-sidebar-fg">User</span>
          </div>
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;
