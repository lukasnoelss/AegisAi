import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";
import { useAuth } from "./hooks/useAuth";
import { AlertCircle, LogOut } from "lucide-react";
import { Button } from "./components/ui/button";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isWhitelisted, logout } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (isWhitelisted === false) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background p-6 text-center">
        <div className="mb-6 rounded-full bg-destructive/10 p-4">
          <AlertCircle className="h-10 w-10 text-destructive" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-foreground">Access Restricted</h1>
        <p className="mb-8 max-w-md text-muted-foreground">
          Your email (<strong>{user.email}</strong>) is not on the authorized list. 
          Please contact an administrator to request access.
        </p>
        <Button variant="outline" onClick={logout} className="gap-2">
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    );
  }

  // Only allow children if both logged in AND whitelisted
  return isWhitelisted ? <>{children}</> : null;
};

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <Index />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
