import { Authenticated, Unauthenticated, useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { useState } from "react";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm p-4 flex justify-between items-center border-b">
        <h2 className="text-xl font-semibold accent-text">JINDAL AI</h2>
        <SignOutButton />
      </header>
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-3xl mx-auto">
          <Content />
        </div>
      </main>
      <Toaster />
    </div>
  );
}

function Content() {
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const messages = useQuery(api.chat.getMessages) ?? [];
  const sendMessage = useMutation(api.chat.sendMessage);
  const [input, setInput] = useState("");

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    const content = input;
    setInput("");
    await sendMessage({ content });
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="text-center">
        <h1 className="text-5xl font-bold accent-text mb-4">JINDAL AI</h1>
        <Authenticated>
          <p className="text-xl text-slate-600">Chat with your AI assistant</p>
        </Authenticated>
        <Unauthenticated>
          <p className="text-xl text-slate-600">Sign in to get started</p>
        </Unauthenticated>
      </div>

      <Unauthenticated>
        <SignInForm />
      </Unauthenticated>

      <Authenticated>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 h-[500px] overflow-y-auto p-4 border rounded-lg">
            {messages.map((message, i) => (
              <div
                key={i}
                className={`p-4 rounded-lg ${
                  message.role === "user"
                    ? "bg-blue-100 ml-12"
                    : "bg-gray-100 mr-12"
                }`}
              >
                {message.content}
              </div>
            ))}
          </div>
          
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 p-2 border rounded"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      </Authenticated>
    </div>
  );
}
