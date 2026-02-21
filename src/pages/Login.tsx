import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Chrome } from "lucide-react";
import { Button } from "@/components/ui/button";

const Login = () => {
  const { user, loginWithGoogle, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative flex h-screen flex-col items-center justify-center overflow-hidden bg-background">
      {/* Background decoration */}
      <div className="absolute top-0 -z-10 h-full w-full">
        <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md px-8 pt-1"
      >
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <MessageSquare className="h-8 w-8 text-primary" />
          </div>
          <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground">
            Welcome to Chatty
          </h1>
          <p className="text-muted-foreground">
            The next generation of conversational AI.
          </p>
        </div>

        <div className="space-y-4">
          <Button
            onClick={handleLogin}
            className="h-12 w-full gap-3 bg-foreground text-background transition-all hover:scale-[1.02] hover:bg-foreground/90 active:scale-[0.98]"
          >
            <Chrome className="h-5 w-5" />
            Continue with Google
          </Button>

          <p className="px-8 text-center text-xs leading-relaxed text-muted-foreground">
            By clicking continue, you agree to our{" "}
            <a href="#" className="underline underline-offset-4 hover:text-primary">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="underline underline-offset-4 hover:text-primary">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </motion.div>

      {/* Footer decoration */}
      <div className="absolute bottom-8 text-center text-sm text-muted-foreground/40">
        © 2026 Chatty AI. All rights reserved.
      </div>
    </div>
  );
};

export default Login;
