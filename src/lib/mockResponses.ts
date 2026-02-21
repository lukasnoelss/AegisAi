const responses = [
  "That's a great question! Here's what I think:\n\nThe answer depends on the context, but generally speaking, you'll want to consider multiple factors before making a decision. Let me break it down for you.\n\n1. **First**, consider your goals\n2. **Second**, evaluate your resources\n3. **Third**, plan your approach\n\nWould you like me to elaborate on any of these points?",
  "Here's a quick example in code:\n\n```typescript\nfunction greet(name: string): string {\n  return `Hello, ${name}! Welcome.`;\n}\n\nconsole.log(greet('World'));\n```\n\nThis is a simple function that demonstrates the concept. Let me know if you need a more complex example!",
  "Great question! Let me explain:\n\n> The best way to predict the future is to create it. — Peter Drucker\n\nHere are some key takeaways:\n\n- Start with a clear vision\n- Break problems into smaller pieces\n- Iterate and improve continuously\n- Don't be afraid to experiment\n\nIs there anything specific you'd like to dive deeper into?",
  "I'd be happy to help with that! Here's my analysis:\n\n### Overview\nThe topic you're asking about has several interesting dimensions.\n\n### Key Points\n- **Performance**: This approach offers significant improvements\n- **Scalability**: It handles growth well\n- **Maintainability**: The code stays clean and readable\n\n### Conclusion\nOverall, I'd recommend going with this approach. Let me know if you have follow-up questions!",
  "Absolutely! Here's what you need to know:\n\nThe concept can be summarized in three words: **simplicity, clarity, and purpose**.\n\nWhen you approach any problem:\n1. Define the problem clearly\n2. Research existing solutions\n3. Build a minimal prototype\n4. Test and iterate\n5. Deploy and monitor\n\nEach step builds on the previous one, creating a solid foundation for success. Would you like me to go into more detail on any step?",
];

export function getMockResponse(): string {
  return responses[Math.floor(Math.random() * responses.length)];
}
