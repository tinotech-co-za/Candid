"use client";
import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

// Utility function to create low-res version of image
const createLowResImage = (
  imgSrc: string,
  quality: number = 0.3,
  maxWidth: number = 300
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      // Calculate dimensions maintaining aspect ratio
      const aspectRatio = img.width / img.height;
      let newWidth = maxWidth;
      let newHeight = maxWidth / aspectRatio;

      if (newHeight > maxWidth) {
        newHeight = maxWidth;
        newWidth = maxWidth * aspectRatio;
      }

      canvas.width = newWidth;
      canvas.height = newHeight;

      // Draw and compress image
      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      // Add slight blur to reduce detail
      ctx.filter = "blur(1px)";
      ctx.drawImage(canvas, 0, 0);
      ctx.filter = "none";

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const lowResUrl = URL.createObjectURL(blob);
            resolve(lowResUrl);
          } else {
            reject(new Error("Could not create low-res image"));
          }
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = imgSrc;
  });
};

interface Photo {
  _id: Id<"photos">;
  url: string | null;
  capturerName: string;
  ownerName: string;
  ownerId: Id<"users">;
  isRevealed: boolean;
  canTrade: boolean;
  capturedAt: number;
}

interface PhotoGalleryProps {
  photos: Photo[];
  sessionId: Id<"sessions">;
  isRevealed: boolean;
}

export function PhotoGallery({
  photos,
  sessionId,
  isRevealed,
}: PhotoGalleryProps) {
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [selectedRequestedPhotos, setSelectedRequestedPhotos] = useState<
    Id<"photos">[]
  >([]);
  const [selectedOfferedPhotos, setSelectedOfferedPhotos] = useState<
    Id<"photos">[]
  >([]);
  const [targetUserId, setTargetUserId] = useState<Id<"users"> | null>(null);
  const [lowResImages, setLowResImages] = useState<Record<string, string>>({});
  const [loadingLowRes, setLoadingLowRes] = useState<Set<string>>(new Set());

  const createTrade = useMutation(api.trades.createTrade);

  const myPhotos = photos.filter((photo) => !photo.canTrade);
  const tradablePhotos = photos.filter((photo) => photo.canTrade);

  // Generate low-res version of image for trading
  const getLowResImage = async (photoId: string, originalUrl: string) => {
    if (lowResImages[photoId] || loadingLowRes.has(photoId)) {
      return lowResImages[photoId];
    }

    setLoadingLowRes((prev) => new Set(prev).add(photoId));

    try {
      const lowResUrl = await createLowResImage(originalUrl, 0.2, 200);
      setLowResImages((prev) => ({ ...prev, [photoId]: lowResUrl }));
      return lowResUrl;
    } catch (error) {
      console.error("Failed to create low-res image:", error);
      return originalUrl; // Fallback to original
    } finally {
      setLoadingLowRes((prev) => {
        const newSet = new Set(prev);
        newSet.delete(photoId);
        return newSet;
      });
    }
  };

  // Determine if we should show low-res version (during trading, not owned by user)
  const shouldShowLowRes = (photo: Photo, isInTradeModal: boolean = false) => {
    return isInTradeModal && photo.canTrade; // Show low-res for photos being traded that user doesn't own
  };

  const handlePhotoSelect = (photo: Photo, isRequested: boolean) => {
    if (isRequested) {
      setSelectedRequestedPhotos((prev) =>
        prev.includes(photo._id)
          ? prev.filter((id) => id !== photo._id)
          : [...prev, photo._id]
      );
      // Set target user when selecting requested photos
      if (!targetUserId) {
        setTargetUserId(photo.ownerId);
      }
    } else {
      setSelectedOfferedPhotos((prev) =>
        prev.includes(photo._id)
          ? prev.filter((id) => id !== photo._id)
          : [...prev, photo._id]
      );
    }
  };

  const handleTradeRequest = async () => {
    if (
      !targetUserId ||
      selectedRequestedPhotos.length === 0 ||
      selectedOfferedPhotos.length === 0
    ) {
      toast.error("Please select photos to offer and request");
      return;
    }

    try {
      await createTrade({
        sessionId,
        toUserId: targetUserId,
        offeredPhotoIds: selectedOfferedPhotos,
        requestedPhotoIds: selectedRequestedPhotos,
      });

      toast.success("Trade request sent!");
      setShowTradeModal(false);
      setSelectedRequestedPhotos([]);
      setSelectedOfferedPhotos([]);
      setTargetUserId(null);
    } catch (error: any) {
      if (error?.message?.includes("Not authenticated")) {
        toast.error("Please sign in to create trade requests.");
      } else if (error?.message?.includes("Not a participant")) {
        toast.error(
          "You're not a participant in this session. Please join the session first."
        );
      } else {
        toast.error("Failed to send trade request. Please try again.");
      }
    }
  };

  const resetTradeModal = () => {
    setShowTradeModal(false);
    setSelectedRequestedPhotos([]);
    setSelectedOfferedPhotos([]);
    setTargetUserId(null);
  };

  // Photo display component that handles low-res logic
  const PhotoDisplay = ({
    photo,
    isInTradeModal = false,
    className = "",
  }: {
    photo: Photo;
    isInTradeModal?: boolean;
    className?: string;
  }) => {
    const [displayUrl, setDisplayUrl] = useState<string | null>(photo.url);

    useEffect(() => {
      if (shouldShowLowRes(photo, isInTradeModal) && photo.url) {
        getLowResImage(photo._id, photo.url).then(setDisplayUrl);
      } else {
        setDisplayUrl(photo.url);
      }
    }, [photo, isInTradeModal]);

    const isLoadingLowRes =
      shouldShowLowRes(photo, isInTradeModal) && loadingLowRes.has(photo._id);

    return (
      <>
        {displayUrl ? (
          <img
            src={displayUrl}
            alt="Photo"
            className={className}
            style={{
              filter: shouldShowLowRes(photo, isInTradeModal)
                ? "blur(0.5px)"
                : "none",
            }}
          />
        ) : (
          <div
            className={`bg-gray-200 flex items-center justify-center ${className}`}
          >
            {isLoadingLowRes ? (
              <div className="text-xs text-gray-500">Processing...</div>
            ) : (
              <span className="text-gray-400">Loading...</span>
            )}
          </div>
        )}
        {shouldShowLowRes(photo, isInTradeModal) && (
          <div className="absolute inset-0 bg-black bg-opacity-10 flex items-center justify-center">
            <div className="bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
              Preview Quality
            </div>
          </div>
        )}
      </>
    );
  };

  if (photos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No photos captured yet</p>
        {!isRevealed && (
          <p className="text-gray-400 text-sm mt-2">
            Photos will appear here once they're revealed
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Trade Button */}
      {isRevealed && tradablePhotos.length > 0 && myPhotos.length > 0 && (
        <div className="text-center">
          <button
            onClick={() => setShowTradeModal(true)}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 font-medium"
          >
            🔄 Start Trading
          </button>
        </div>
      )}

      {/* My Photos */}
      {myPhotos.length > 0 && (
        <div>
          <h3 className="font-semibold mb-4">
            Your Photos ({myPhotos.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {myPhotos.map((photo) => (
              <div key={photo._id} className="relative group">
                {photo.url ? (
                  <img
                    src={photo.url}
                    alt="Candid moment"
                    className="w-full h-32 object-cover rounded-lg shadow-md"
                  />
                ) : (
                  <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                    <span className="text-gray-400">Loading...</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 text-white text-xs text-center p-2">
                    <p>By: {photo.capturerName}</p>
                    <p>{new Date(photo.capturedAt).toLocaleTimeString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tradable Photos */}
      {isRevealed && tradablePhotos.length > 0 && (
        <div>
          <h3 className="font-semibold mb-4">
            Available for Trade ({tradablePhotos.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {tradablePhotos.map((photo) => (
              <div key={photo._id} className="relative group">
                {photo.url ? (
                  <img
                    src={photo.url}
                    alt="Candid moment"
                    className="w-full h-32 object-cover rounded-lg shadow-md"
                  />
                ) : (
                  <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                    <span className="text-gray-400">Loading...</span>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                  {photo.ownerName}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trade Modal */}
      {showTradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-xl font-semibold mb-4">Create Trade Offer</h3>

            {/* Low-res notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
              <div className="flex items-start gap-2">
                <span className="text-amber-600 text-sm">ℹ️</span>
                <div className="text-sm text-amber-800">
                  <strong>Preview Quality:</strong> Photos shown here are in low
                  resolution to protect image quality. You'll receive the
                  full-resolution images after successful trades.
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Photos You Want */}
              <div>
                <h4 className="font-medium mb-3 text-green-700">
                  Photos You Want ({selectedRequestedPhotos.length} selected)
                </h4>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto border rounded-lg p-2">
                  {tradablePhotos.map((photo) => (
                    <div
                      key={photo._id}
                      className={`relative cursor-pointer border-2 rounded ${
                        selectedRequestedPhotos.includes(photo._id)
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 hover:border-green-300"
                      }`}
                      onClick={() => handlePhotoSelect(photo, true)}
                    >
                      <PhotoDisplay
                        photo={photo}
                        isInTradeModal={true}
                        className="w-full h-20 object-cover rounded"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs px-1 py-0.5 rounded-b">
                        {photo.ownerName}
                      </div>
                      {selectedRequestedPhotos.includes(photo._id) && (
                        <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                          ✓
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Photos You Offer */}
              <div>
                <h4 className="font-medium mb-3 text-blue-700">
                  Photos You Offer ({selectedOfferedPhotos.length} selected)
                </h4>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto border rounded-lg p-2">
                  {myPhotos.map((photo) => (
                    <div
                      key={photo._id}
                      className={`relative cursor-pointer border-2 rounded ${
                        selectedOfferedPhotos.includes(photo._id)
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-blue-300"
                      }`}
                      onClick={() => handlePhotoSelect(photo, false)}
                    >
                      <PhotoDisplay
                        photo={photo}
                        isInTradeModal={true}
                        className="w-full h-20 object-cover rounded"
                      />
                      {selectedOfferedPhotos.includes(photo._id) && (
                        <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                          ✓
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Trade Summary */}
            {(selectedRequestedPhotos.length > 0 ||
              selectedOfferedPhotos.length > 0) && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Trade Summary:</h4>
                <p className="text-sm text-gray-600">
                  You're offering{" "}
                  <strong>{selectedOfferedPhotos.length}</strong> photo
                  {selectedOfferedPhotos.length !== 1 ? "s" : ""}
                  {targetUserId && (
                    <>
                      {" "}
                      for <strong>{selectedRequestedPhotos.length}</strong>{" "}
                      photo{selectedRequestedPhotos.length !== 1 ? "s" : ""}{" "}
                      from{" "}
                      <strong>
                        {
                          tradablePhotos.find((p) => p.ownerId === targetUserId)
                            ?.ownerName
                        }
                      </strong>
                    </>
                  )}
                </p>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleTradeRequest}
                disabled={
                  selectedRequestedPhotos.length === 0 ||
                  selectedOfferedPhotos.length === 0
                }
                className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Send Trade Request
              </button>
              <button
                onClick={resetTradeModal}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
