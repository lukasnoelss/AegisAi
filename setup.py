import subprocess
import sys
from setuptools import setup
from setuptools.command.install import install

class CustomInstallCommand(install):
    """Custom installation step to pull the ollama model."""
    def run(self):
        install.run(self)
        try:
            print("Running custom installation step: pulling Ollama gemma3:270m model...")
            subprocess.check_call(["ollama", "pull", "gemma3:270m"])
            print("Successfully pulled gemma3:270m model.")
        except subprocess.CalledProcessError as e:
            print(f"Warning: Failed to pull Ollama model automatically. Error: {e}", file=sys.stderr)
            print("Please ensure Ollama is installed and run 'ollama pull gemma3:270m' manually.", file=sys.stderr)
        except Exception as e:
            print(f"Warning: An unexpected error occurred while pulling the model: {e}", file=sys.stderr)
            print("Please run 'ollama pull gemma3:270m' manually.", file=sys.stderr)

setup(
    name="aegis-local",
    version="0.1.2",
    description="Local privacy protection and model server",
    cmdclass={
        'install': CustomInstallCommand,
    },
)
