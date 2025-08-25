"use client";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { SignInForm } from "../../components/SignInForm";
import { SignOutButton } from "../../components/SignOutButton";
import { SessionView } from "../../components/SessionView";
import { useParams, useRouter } from "next/navigation";
import { Id } from "../../../convex/_generated/dataModel";

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as Id<"sessions">;

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
        <Content sessionId={sessionId} />
      </main>
    </div>
  );
}

function Content({ sessionId }: { sessionId: Id<"sessions"> }) {
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
