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
      where("ownerId", "==", userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: (doc.data().createdAt as Timestamp)?.toDate() || new Date(),
      })) as Conversation[];

      // Client-side sorting to ensure the latest shows up at the top
      // This avoids the need for a composite index in Firestore initially
      const sortedConvs = convs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      console.log("Fetched and sorted conversations:", sortedConvs.length);
      setConversations(sortedConvs);
      setLoading(false);
    }, (error) => {
      console.error("Conversations snapshot error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  // Sync messages for active conversation
  // ... (keeping existing message sync)
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
    }, (error) => {
      console.error("Messages snapshot error:", error);
    });

    return () => unsubscribe();
  }, [activeId, userId]);

  const createConversation = async (title: string, model: string = "gemini") => {
    if (!userId) throw new Error("User not authenticated");
    console.log("Creating conversation for user:", userId, "with model:", model);

    try {
      const docRef = await addDoc(collection(db, "conversations"), {
        title: title.slice(0, 40) || "New chat",
        ownerId: userId,
        model,
        createdAt: serverTimestamp(),
      });
      console.log("Conversation created with ID:", docRef.id);
      return docRef.id;
    } catch (error) {
      console.error("Error creating conversation:", error);
      throw error;
    }
  };

  const sendMessage = async (
    convId: string,
    content: string,
    role: "user" | "assistant",
    pipelineSteps?: { label: string; content: string; type: string }[]
  ) => {
    if (!userId) return;

    const messageData: Record<string, any> = {
      content,
      role,
      timestamp: serverTimestamp(),
    };

    if (pipelineSteps && pipelineSteps.length > 0) {
      messageData.pipelineSteps = pipelineSteps;
    }

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

  const deleteAllConversations = async () => {
    if (!userId) return;
    const promises = conversations.map(conv => deleteDoc(doc(db, "conversations", conv.id)));
    await Promise.all(promises);
  };

  const updateConversationModel = async (id: string, model: "gemini" | "claude") => {
    await updateDoc(doc(db, "conversations", id), { model });
  };

  return {
    conversations,
    messages,
    loading,
    createConversation,
    sendMessage,
    deleteConversation,
    deleteAllConversations,
    updateConversationModel
  };
};
