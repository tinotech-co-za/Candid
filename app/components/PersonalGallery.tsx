"use client";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

interface GalleryPhoto {
  _id: string;
  url: string | null;
  sessionName: string;
  capturerName: string;
  capturedAtFormatted: string;
}

export function PersonalGallery() {
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);

  const photos = useQuery(api.photos.getUserGallery);

  const handlePhotoSelect = (photoId: string) => {
    const newSelected = new Set(selectedPhotos);
    if (newSelected.has(photoId)) {
      newSelected.delete(photoId);
    } else {
      newSelected.add(photoId);
    }
    setSelectedPhotos(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedPhotos.size === photos?.length) {
      setSelectedPhotos(new Set());
    } else {
      setSelectedPhotos(new Set(photos?.map((p) => p._id) || []));
    }
  };

  const downloadPhoto = async (photo: GalleryPhoto) => {
    if (!photo.url) return;

    try {
      const response = await fetch(photo.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `candid-${photo.sessionName}-${photo.capturedAtFormatted}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Photo downloaded!");
    } catch (error) {
      toast.error("Failed to download photo");
    }
  };

  const downloadSelectedPhotos = async () => {
    if (selectedPhotos.size === 0) return;

    setIsDownloading(true);
    let downloaded = 0;

    try {
      for (const photoId of selectedPhotos) {
        const photo = photos?.find((p) => p._id === photoId);
        if (photo && photo.url) {
          const response = await fetch(photo.url);
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);

          const a = document.createElement("a");
          a.href = url;
          a.download = `candid-${photo.sessionName}-${photo.capturedAtFormatted}.jpg`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);

          downloaded++;
          // Add small delay to avoid overwhelming the browser
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      toast.success(`Downloaded ${downloaded} photos!`);
      setSelectedPhotos(new Set());
    } catch (error) {
      toast.error("Failed to download some photos");
    } finally {
      setIsDownloading(false);
    }
  };

  if (!photos) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-gray-500 mt-4">Loading your gallery...</p>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📷</div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">
          No photos yet
        </h3>
        <p className="text-gray-500">
          Start capturing and trading photos to build your personal gallery!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with bulk actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            Your Gallery ({photos.length} photos)
          </h3>
          <p className="text-sm text-gray-600">
            Photos you've captured and traded from all sessions
          </p>
        </div>

        {photos.length > 0 && (
          <div className="flex gap-3">
            <button
              onClick={handleSelectAll}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm"
            >
              {selectedPhotos.size === photos.length
                ? "Deselect All"
                : "Select All"}
            </button>

            {selectedPhotos.size > 0 && (
              <button
                onClick={downloadSelectedPhotos}
                disabled={isDownloading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
              >
                {isDownloading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Downloading...
                  </>
                ) : (
                  <>
                    📥 Download {selectedPhotos.size} photo
                    {selectedPhotos.size > 1 ? "s" : ""}
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Photos Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <div
            key={photo._id}
            className="relative group bg-white rounded-lg shadow-md overflow-hidden"
          >
            {/* Checkbox */}
            <div className="absolute top-2 left-2 z-10">
              <input
                type="checkbox"
                checked={selectedPhotos.has(photo._id)}
                onChange={() => handlePhotoSelect(photo._id)}
                className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
              />
            </div>

            {/* Download button */}
            <button
              onClick={() => downloadPhoto(photo)}
              className="absolute top-2 right-2 z-10 bg-black bg-opacity-50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-opacity-70"
              title="Download photo"
            >
              📥
            </button>

            {/* Photo */}
            <div className="aspect-square">
              {photo.url ? (
                <img
                  src={photo.url}
                  alt={`Photo from ${photo.sessionName}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-400">Loading...</span>
                </div>
              )}
            </div>

            {/* Photo info */}
            <div className="p-3">
              <div className="text-sm font-medium text-gray-900 truncate">
                {photo.sessionName}
              </div>
              <div className="text-xs text-gray-500">
                By {photo.capturerName}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {photo.capturedAtFormatted}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Selection summary */}
      {selectedPhotos.size > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>{selectedPhotos.size}</strong> photo
            {selectedPhotos.size > 1 ? "s" : ""} selected
          </p>
        </div>
      )}
    </div>
  );
}
