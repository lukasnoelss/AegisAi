import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Lock, Server, Cpu, ArrowRight, Mail, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

const Landing = () => {
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden selection:bg-primary/30">
      {/* Dynamic Animated Background */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3] 
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-primary/10 blur-[100px]" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2] 
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full bg-primary/10 blur-[120px]" 
        />
      </div>

      {/* Navigation Bar */}
      <nav className="border-b border-border/40 bg-background/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold tracking-tight">Aegis AI</span>
          </div>
          <Button 
            onClick={() => navigate("/chat")} 
            className="rounded-full shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
          >
            Try Aegis
          </Button>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 pt-20 pb-16 lg:pt-32">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center text-center"
        >
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary shadow-sm mb-8 hover:bg-primary/20 transition-colors">
            <Lock className="h-4 w-4" />
            <span>Defensive Acceleration for Enterprise AI</span>
          </motion.div>
          
          <motion.h1 variants={itemVariants} className="text-balance text-5xl font-extrabold tracking-tight sm:text-7xl lg:text-8xl">
            Private. Intelligent. <span className="bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent">Yours.</span>
          </motion.h1>
          
          <motion.p variants={itemVariants} className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl leading-relaxed">
            Aegis AI intercepts your prompt, strips out sensitive information locally using Gemma, 
            and replaces it with secure placeholders before sending to cloud LLMs.
          </motion.p>

          <motion.div variants={itemVariants} className="mt-10 flex flex-wrap justify-center gap-4">
            <Button 
              size="lg" 
              onClick={() => navigate("/chat")} 
              className="group h-14 rounded-full px-8 text-base shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 gap-2"
            >
              Start Chatting 
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => {
                document.getElementById("whitelisting")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="h-14 rounded-full px-8 text-base bg-background/50 backdrop-blur-sm transition-all hover:bg-accent hover:text-accent-foreground"
            >
              Get Whitelisted
            </Button>
          </motion.div>
        </motion.div>

        {/* Feature Grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="mt-24 grid grid-cols-1 gap-8 md:grid-cols-3"
        >
          <motion.div variants={itemVariants} className="group rounded-3xl border border-border/50 bg-background/50 p-8 backdrop-blur-sm transition-all hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/5">
            <div className="mb-4 inline-flex rounded-2xl bg-primary/10 p-3 text-primary transition-transform group-hover:scale-110">
              <Cpu className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-xl font-bold">Local Gemma Model</h3>
            <p className="text-muted-foreground leading-relaxed">
              PII is detected and stripped entirely on your device using a lightweight local LLM. Nothing leaks.
            </p>
          </motion.div>
          
          <motion.div variants={itemVariants} className="group rounded-3xl border border-primary/20 bg-gradient-to-b from-primary/5 to-background p-8 backdrop-blur-sm transition-all hover:border-primary/50 hover:-translate-y-1 shadow-xl shadow-primary/5 relative z-10">
            <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-primary/20 group-hover:ring-primary/40 transition-all" />
            <div className="mb-4 inline-flex rounded-2xl bg-primary/10 p-3 text-primary transition-transform group-hover:scale-110">
              <Lock className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-xl font-bold">The Privacy Shield</h3>
            <p className="text-muted-foreground leading-relaxed">
              Names, addresses, and secrets are swapped with encrypted placeholders before hitting the cloud.
            </p>
          </motion.div>
          
          <motion.div variants={itemVariants} className="group rounded-3xl border border-border/50 bg-background/50 p-8 backdrop-blur-sm transition-all hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/5">
            <div className="mb-4 inline-flex rounded-2xl bg-primary/10 p-3 text-primary transition-transform group-hover:scale-110">
              <Layers className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-xl font-bold">Universal Proxy</h3>
            <p className="text-muted-foreground leading-relaxed">
              Aegis sits securely between any chat interface and the AI, enforcing data safety locally regardless of the LLM.
            </p>
          </motion.div>
        </motion.div>

        {/* Whitelisting Section */}
        <motion.div 
          id="whitelisting"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mt-32 rounded-3xl border border-border/50 bg-gradient-to-br from-primary/5 to-background p-10 text-center sm:p-16 relative overflow-hidden shadow-2xl shadow-black/5"
        >
          <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-primary/10 blur-[50px] animate-pulse"></div>
          <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-primary/10 blur-[50px] animate-pulse" style={{ animationDelay: "1s" }}></div>
          
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl text-foreground relative z-10">
            Join the Beta
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground mb-8 relative z-10">
            Access to Aegis AI is currently restricted to approved enterprise and beta users. 
            Want to secure your team's AI interactions? Contact our founders to get whitelisted.
          </p>
          
          <div className="flex flex-col items-center justify-center gap-6 sm:flex-row relative z-10">
            <a 
              href="mailto:lukasnoel05@gmail.com"
              className="group flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border border-border/50 bg-background/80 p-6 backdrop-blur-md transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1"
            >
              <div className="rounded-full bg-primary/10 p-4 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                <Mail className="h-6 w-6" />
              </div>
              <div className="text-center">
                <div className="font-semibold text-foreground text-lg">Lukas Noel</div>
                <div className="text-sm text-muted-foreground group-hover:text-primary transition-colors">lukasnoel05@gmail.com</div>
              </div>
            </a>
            
            <a 
              href="mailto:AdvikBahadur@gmail.com"
              className="group flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border border-border/50 bg-background/80 p-6 backdrop-blur-md transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1"
            >
              <div className="rounded-full bg-primary/10 p-4 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                <Mail className="h-6 w-6" />
              </div>
              <div className="text-center">
                <div className="font-semibold text-foreground text-lg">Advik Bahadur</div>
                <div className="text-sm text-muted-foreground group-hover:text-primary transition-colors">AdvikBahadur@gmail.com</div>
              </div>
            </a>
          </div>
        </motion.div>
      </main>

      <footer className="border-t border-border/40 mt-16 py-8 text-center text-sm text-muted-foreground">
        <p>© 2026 Aegis AI. Defensive Acceleration Track.</p>
      </footer>
    </div>
  );
};

export default Landing;
