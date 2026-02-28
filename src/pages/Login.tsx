import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Chrome } from "lucide-react";
import { Button } from "@/components/ui/button";

const Login = () => {
  const { user, loginWithGoogle, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/chat");
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
        <div className="absolute top-[-20%] left-[20%] h-[600px] w-[600px] rounded-full bg-primary/6 blur-[150px]" />
        <div className="absolute bottom-[-15%] right-[-5%] h-[400px] w-[400px] rounded-full bg-primary/8 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-sm px-6"
      >
        <div className="mb-12 flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 ring-1 ring-primary/20 shadow-lg shadow-primary/10"
          >
            <Shield className="h-10 w-10 text-primary" />
          </motion.div>
          <h1 className="mb-1 text-4xl font-bold tracking-tight text-foreground">
            Aegis AI
          </h1>
          <p className="text-sm text-muted-foreground">
            Private. Intelligent. Yours.
          </p>
        </div>

        <div className="space-y-4">
          <Button
            onClick={handleLogin}
            className="h-12 w-full gap-3 rounded-xl bg-primary text-primary-foreground transition-all hover:scale-[1.02] hover:brightness-110 active:scale-[0.98]"
          >
            <Chrome className="h-5 w-5" />
            Continue with Google
          </Button>

          <p className="px-4 text-center text-[11px] leading-relaxed text-muted-foreground">
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

      <div className="absolute bottom-8 text-center text-xs text-muted-foreground/30">
        © 2026 Aegis AI. All rights reserved.
      </div>
    </div>
  );
};

export default Login;
