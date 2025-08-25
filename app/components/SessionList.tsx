"use client";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface SessionListProps {
  onSelectSession: (sessionId: Id<"sessions">) => void;
}

export function SessionList({ onSelectSession }: SessionListProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [showJoinForm, setShowJoinForm] = useState(false);

  const sessions = useQuery(api.sessions.getUserSessions) || [];
  const createSession = useMutation(api.sessions.createSession);
  const joinSession = useMutation(api.sessions.joinSession);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionName.trim()) return;

    try {
      const sessionId = await createSession({ name: sessionName });
      toast.success("Session created!");
      setSessionName("");
      setShowCreateForm(false);
      onSelectSession(sessionId);
    } catch (error) {
      toast.error("Failed to create session");
    }
  };

  const handleJoinSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    try {
      await joinSession({ sessionId: joinCode as Id<"sessions"> });
      toast.success("Joined session!");
      setJoinCode("");
      setShowJoinForm(false);
      onSelectSession(joinCode as Id<"sessions">);
    } catch (error) {
      toast.error("Failed to join session");
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Your Photo Sessions
        </h1>
        <p className="text-gray-600">
          Create a new session or join an existing one
        </p>
      </div>

      <div className="flex gap-4 justify-center">
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create Session
        </button>
        <button
          onClick={() => setShowJoinForm(!showJoinForm)}
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          Join Session
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto">
          <h3 className="text-lg font-semibold mb-4">Create New Session</h3>
          <form onSubmit={handleCreateSession} className="space-y-4">
            <input
              type="text"
              placeholder="Session name (e.g., 'Beach Day')"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {showJoinForm && (
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto">
          <h3 className="text-lg font-semibold mb-4">Join Session</h3>
          <form onSubmit={handleJoinSession} className="space-y-4">
            <input
              type="text"
              placeholder="Session ID"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
              >
                Join
              </button>
              <button
                type="button"
                onClick={() => setShowJoinForm(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sessions.filter(Boolean).map((session) => (
          <div
            key={session._id}
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => onSelectSession(session._id)}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-lg">{session.name}</h3>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  session.status === "active"
                    ? "bg-green-100 text-green-800"
                    : session.status === "revealed"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-800"
                }`}
              >
                {session.status}
              </span>
            </div>
            <p className="text-gray-600 text-sm mb-2">
              Host: {session.hostName}
            </p>
            <p className="text-gray-600 text-sm">
              {session.participantCount} participant
              {session.participantCount !== 1 ? "s" : ""}
            </p>
            {session.isHost && (
              <p className="text-blue-600 text-xs mt-2 font-medium">
                You're the host
              </p>
            )}
          </div>
        ))}
      </div>

      {sessions.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No sessions yet</p>
          <p className="text-gray-400">
            Create your first session to get started!
          </p>
        </div>
      )}
    </div>
  );
}
