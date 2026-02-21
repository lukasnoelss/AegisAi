import { useState, useEffect } from "react";
import { 
  collection, 
  query, 
  orderBy, 
  where,
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  Timestamp 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Conversation, Message } from "@/types/chat";

export const useChat = (activeId: string | null, userId: string | undefined) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync conversations for the specific user
  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, "conversations"), 
      where("ownerId", "==", userId),
      orderBy("createdAt", "desc")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: (doc.data().createdAt as Timestamp)?.toDate() || new Date(),
      })) as Conversation[];
      setConversations(convs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  // Sync messages for active conversation
  useEffect(() => {
    if (!activeId || !userId) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, "conversations", activeId, "messages"),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: (doc.data().timestamp as Timestamp)?.toDate() || new Date(),
      })) as Message[];
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [activeId, userId]);

  const createConversation = async (title: string) => {
    if (!userId) throw new Error("User not authenticated");
    
    const docRef = await addDoc(collection(db, "conversations"), {
      title,
      ownerId: userId,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  };

  const sendMessage = async (convId: string, content: string, role: "user" | "assistant") => {
    if (!userId) return;

    const messageData = {
      content,
      role,
      timestamp: serverTimestamp(),
    };

    await addDoc(collection(db, "conversations", convId, "messages"), messageData);
    
    // Update conversation title if it's the first message
    const conv = conversations.find(c => c.id === convId);
    if (conv && (!conv.title || conv.title === "New chat")) {
      await updateDoc(doc(db, "conversations", convId), {
        title: content.slice(0, 40)
      });
    }
  };

  const deleteConversation = async (id: string) => {
    await deleteDoc(doc(db, "conversations", id));
  };

  return {
    conversations,
    messages,
    loading,
    createConversation,
    sendMessage,
    deleteConversation
  };
};
