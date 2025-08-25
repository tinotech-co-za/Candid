import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

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

export function PhotoGallery({ photos, sessionId, isRevealed }: PhotoGalleryProps) {
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [selectedRequestedPhotos, setSelectedRequestedPhotos] = useState<Id<"photos">[]>([]);
  const [selectedOfferedPhotos, setSelectedOfferedPhotos] = useState<Id<"photos">[]>([]);
  const [targetUserId, setTargetUserId] = useState<Id<"users"> | null>(null);

  const createTrade = useMutation(api.trades.createTrade);

  const myPhotos = photos.filter(photo => !photo.canTrade);
  const tradablePhotos = photos.filter(photo => photo.canTrade);

  const handlePhotoSelect = (photo: Photo, isRequested: boolean) => {
    if (isRequested) {
      setSelectedRequestedPhotos(prev => 
        prev.includes(photo._id) 
          ? prev.filter(id => id !== photo._id)
          : [...prev, photo._id]
      );
      // Set target user when selecting requested photos
      if (!targetUserId) {
        setTargetUserId(photo.ownerId);
      }
    } else {
      setSelectedOfferedPhotos(prev => 
        prev.includes(photo._id) 
          ? prev.filter(id => id !== photo._id)
          : [...prev, photo._id]
      );
    }
  };

  const handleTradeRequest = async () => {
    if (!targetUserId || selectedRequestedPhotos.length === 0 || selectedOfferedPhotos.length === 0) {
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
    } catch (error) {
      toast.error("Failed to send trade request");
    }
  };

  const resetTradeModal = () => {
    setShowTradeModal(false);
    setSelectedRequestedPhotos([]);
    setSelectedOfferedPhotos([]);
    setTargetUserId(null);
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
          <h3 className="font-semibold mb-4">Your Photos ({myPhotos.length})</h3>
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
          <h3 className="font-semibold mb-4">Available for Trade ({tradablePhotos.length})</h3>
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
            <h3 className="text-xl font-semibold mb-6">Create Trade Offer</h3>
            
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
                      {photo.url && (
                        <img
                          src={photo.url}
                          alt="Available photo"
                          className="w-full h-20 object-cover rounded"
                        />
                      )}
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
                      {photo.url && (
                        <img
                          src={photo.url}
                          alt="Your photo"
                          className="w-full h-20 object-cover rounded"
                        />
                      )}
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
            {(selectedRequestedPhotos.length > 0 || selectedOfferedPhotos.length > 0) && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Trade Summary:</h4>
                <p className="text-sm text-gray-600">
                  You're offering <strong>{selectedOfferedPhotos.length}</strong> photo{selectedOfferedPhotos.length !== 1 ? 's' : ''} 
                  {targetUserId && (
                    <> for <strong>{selectedRequestedPhotos.length}</strong> photo{selectedRequestedPhotos.length !== 1 ? 's' : ''} from{' '}
                    <strong>{tradablePhotos.find(p => p.ownerId === targetUserId)?.ownerName}</strong></>
                  )}
                </p>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleTradeRequest}
                disabled={selectedRequestedPhotos.length === 0 || selectedOfferedPhotos.length === 0}
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
