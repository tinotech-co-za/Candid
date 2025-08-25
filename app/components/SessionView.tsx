"use client";
import { useState, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { PhotoGallery } from "./PhotoGallery";
import { TradePanel } from "./TradePanel";
import { GamificationPanel } from "./GamificationPanel";
import { PersonalGallery } from "./PersonalGallery";

interface SessionViewProps {
  sessionId: Id<"sessions">;
}

export function SessionView({ sessionId }: SessionViewProps) {
  const [activeTab, setActiveTab] = useState<
    "photos" | "trades" | "gamification" | "gallery"
  >("photos");
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sessionDetails = useQuery(api.sessions.getSessionDetails, {
    sessionId,
  });
  const photos = useQuery(api.photos.getSessionPhotos, { sessionId });
  const trades = useQuery(api.trades.getUserTrades, { sessionId });

  const generateUploadUrl = useMutation(api.photos.generateUploadUrl);
  const capturePhoto = useMutation(api.photos.capturePhoto);
  const revealPhotos = useMutation(api.sessions.revealPhotos);

  const handlePhotoCapture = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingPhotos(true);
    setUploadProgress(0);

    let uploadedCount = 0;
    const totalFiles = files.length;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Generate upload URL for each file
        const uploadUrl = await generateUploadUrl();

        // Upload file
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!result.ok) {
          throw new Error(`Upload failed for ${file.name}`);
        }

        const { storageId } = await result.json();

        // Save photo to session
        await capturePhoto({ sessionId, storageId });

        uploadedCount++;
        setUploadProgress((uploadedCount / totalFiles) * 100);
      }

      toast.success(
        `${totalFiles} photo${totalFiles > 1 ? "s" : ""} captured successfully!`
      );

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      if (error?.message?.includes("Not authenticated")) {
        toast.error("Please sign in to capture photos.");
      } else if (error?.message?.includes("Not a participant")) {
        toast.error(
          "You're not a participant in this session. Please join the session first."
        );
      } else {
        toast.error(
          `Failed to capture photos. ${uploadedCount} succeeded. Please try again.`
        );
      }
    } finally {
      setUploadingPhotos(false);
      setUploadProgress(0);
    }
  };

  const handleRevealPhotos = async () => {
    try {
      await revealPhotos({ sessionId });
      toast.success("Photos revealed!");
    } catch (error: any) {
      if (error?.message?.includes("Not authenticated")) {
        toast.error("Please sign in to reveal photos.");
      } else if (error?.message?.includes("Not a participant")) {
        toast.error("Only session hosts can reveal photos.");
      } else {
        toast.error("Failed to reveal photos. Please try again.");
      }
    }
  };

  const handleCopySessionId = async () => {
    try {
      await navigator.clipboard.writeText(sessionId);
      toast.success("Session ID copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy session ID");
    }
  };

  const handleShareViaWhatsApp = () => {
    const message = `Join my Candid photo session! Session ID: ${sessionId}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleShareViaTelegram = () => {
    const message = `Join my Candid photo session! Session ID: ${sessionId}`;
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(sessionId)}&text=${encodeURIComponent(message)}`;
    window.open(telegramUrl, "_blank");
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Candid Session",
          text: `Join my Candid photo session! Session ID: ${sessionId}`,
          url: window.location.href,
        });
      } catch (error) {
        // User cancelled the share or sharing failed
        console.log("Error sharing:", error);
      }
    }
  };

  if (!sessionDetails) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const canReveal = sessionDetails.isHost && sessionDetails.status === "active";
  const isRevealed = sessionDetails.status === "revealed";

  return (
    <div className="space-y-6">
      {/* Session Header */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">{sessionDetails.name}</h1>
            <p className="text-gray-600">
              {sessionDetails.participants.length} participants
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                sessionDetails.status === "active"
                  ? "bg-green-100 text-green-800"
                  : sessionDetails.status === "revealed"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-gray-100 text-gray-800"
              }`}
            >
              {sessionDetails.status}
            </span>
            {canReveal && (
              <button
                onClick={handleRevealPhotos}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
              >
                🎉 Reveal Photos
              </button>
            )}
          </div>
        </div>

        {/* Session ID for sharing */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">
            Share this session with friends:
          </p>
          <div className="flex items-center gap-2 mb-3">
            <code className="text-sm font-mono bg-white px-2 py-1 rounded border flex-1">
              {sessionId}
            </code>
            <button
              onClick={handleCopySessionId}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
              title="Copy session ID"
            >
              📋 Copy
            </button>
          </div>

          {/* Share buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleShareViaWhatsApp}
              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors flex items-center gap-1"
              title="Share via WhatsApp"
            >
              💬 WhatsApp
            </button>
            <button
              onClick={handleShareViaTelegram}
              className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition-colors flex items-center gap-1"
              title="Share via Telegram"
            >
              ✈️ Telegram
            </button>
            {(navigator as any)?.share && (
              <button
                onClick={handleNativeShare}
                className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700 transition-colors flex items-center gap-1"
                title="Share via other apps"
              >
                📤 Share
              </button>
            )}
          </div>
        </div>

        {/* Participants */}
        <div className="mt-4">
          <h3 className="font-medium mb-2">Participants:</h3>
          <div className="flex flex-wrap gap-2">
            {sessionDetails.participants.map((participant) => (
              <span
                key={participant.id}
                className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm"
              >
                {participant.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Photo Capture */}
      {sessionDetails.status === "active" && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="font-semibold mb-4">📷 Capture Candid Moments</h3>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoCapture}
            disabled={uploadingPhotos}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 mt-2">
            Select multiple photos at once! They will be hidden until the host
            reveals them
          </p>

          {/* Upload Progress */}
          {uploadingPhotos && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Uploading photos...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b">
          <nav className="flex">
            <button
              onClick={() => setActiveTab("photos")}
              className={`px-6 py-3 font-medium text-sm ${
                activeTab === "photos"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Photos ({photos?.length || 0})
            </button>
            {isRevealed && (
              <button
                onClick={() => setActiveTab("trades")}
                className={`px-6 py-3 font-medium text-sm ${
                  activeTab === "trades"
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Trades ({trades?.length || 0})
              </button>
            )}
            <button
              onClick={() => setActiveTab("gamification")}
              className={`px-6 py-3 font-medium text-sm ${
                activeTab === "gamification"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              🏆 Stats
            </button>
            <button
              onClick={() => setActiveTab("gallery")}
              className={`px-6 py-3 font-medium text-sm ${
                activeTab === "gallery"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              🖼️ My Gallery
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "photos" && (
            <PhotoGallery
              photos={photos || []}
              sessionId={sessionId}
              isRevealed={isRevealed}
            />
          )}
          {activeTab === "trades" && isRevealed && (
            <TradePanel trades={trades || []} sessionId={sessionId} />
          )}
          {activeTab === "gamification" && (
            <GamificationPanel sessionId={sessionId} />
          )}
          {activeTab === "gallery" && <PersonalGallery />}
        </div>
      </div>
    </div>
  );
}
