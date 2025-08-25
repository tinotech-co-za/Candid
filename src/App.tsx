import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { SessionList } from "./components/SessionList";
import { SessionView } from "./components/SessionView";
import { useState } from "react";
import { Id } from "../convex/_generated/dataModel";

export default function App() {
  const [currentSessionId, setCurrentSessionId] = useState<Id<"sessions"> | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-primary">📸 Candid</h2>
          {currentSessionId && (
            <button
              onClick={() => setCurrentSessionId(null)}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              ← Back to Sessions
            </button>
          )}
        </div>
        <SignOutButton />
      </header>
      <main className="flex-1 p-4">
        <Content 
          currentSessionId={currentSessionId}
          setCurrentSessionId={setCurrentSessionId}
        />
      </main>
      <Toaster />
    </div>
  );
}

function Content({ 
  currentSessionId, 
  setCurrentSessionId 
}: { 
  currentSessionId: Id<"sessions"> | null;
  setCurrentSessionId: (id: Id<"sessions"> | null) => void;
}) {
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Authenticated>
        {currentSessionId ? (
          <SessionView 
            sessionId={currentSessionId}
            onBack={() => setCurrentSessionId(null)}
          />
        ) : (
          <SessionList onSelectSession={setCurrentSessionId} />
        )}
      </Authenticated>

      <Unauthenticated>
        <div className="text-center py-12">
          <h1 className="text-4xl font-bold text-primary mb-4">📸 Candid</h1>
          <p className="text-xl text-gray-600 mb-8">
            Capture and trade candid moments with friends
          </p>
          <SignInForm />
        </div>
      </Unauthenticated>
    </div>
  );
}
