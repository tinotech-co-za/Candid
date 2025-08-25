"use client";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { SignInForm } from "../../components/SignInForm";
import { SignOutButton } from "../../components/SignOutButton";
import { SessionView } from "../../components/SessionView";
import { useParams, useRouter } from "next/navigation";
import { Id } from "../../../convex/_generated/dataModel";
import { useState, useEffect } from "react";

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as Id<"sessions">;
  const [hasAccessError, setHasAccessError] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-primary">📸 Candid</h2>
          <button
            onClick={() => router.push("/")}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            ← Back to Sessions
          </button>
        </div>
        <SignOutButton />
      </header>
      <main className="flex-1 p-4">
        <Content
          sessionId={sessionId}
          onAccessError={() => setHasAccessError(true)}
          hasAccessError={hasAccessError}
        />
      </main>
    </div>
  );
}

function Content({
  sessionId,
  onAccessError,
  hasAccessError,
}: {
  sessionId: Id<"sessions">;
  onAccessError: () => void;
  hasAccessError: boolean;
}) {
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const [hasAuthError, setHasAuthError] = useState(false);

  // Always call useQuery hooks in the same order
  const sessionDetails = useQuery(api.sessions.getSessionDetails, {
    sessionId,
  });
  const photos = useQuery(api.photos.getSessionPhotos, { sessionId });

  // Check for authentication and access errors
  useEffect(() => {
    if (loggedInUser === null) {
      // User is not authenticated
      setHasAuthError(true);
    } else if (loggedInUser && sessionDetails === null) {
      // User is authenticated but session query failed (likely not a participant)
      onAccessError();
    }
  }, [sessionDetails, loggedInUser, onAccessError]);

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show authentication required message
  if (hasAuthError || loggedInUser === null) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-blue-600 mb-4">
              Sign In Required
            </h2>
            <p className="text-gray-600 mb-6">
              You need to sign in to view session details and participate in
              photo trading.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => (window.location.href = "/")}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Home Page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show access error if user is not a participant
  if (hasAccessError) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              Access Denied
            </h2>
            <p className="text-gray-600 mb-6">
              You're not a participant in this session. You need to join the
              session first to view its contents.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => (window.location.href = "/")}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Browse Sessions
              </button>
              <p className="text-sm text-gray-500">
                Ask the session host for the session ID to join
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Authenticated>
        <SessionView sessionId={sessionId} />
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
