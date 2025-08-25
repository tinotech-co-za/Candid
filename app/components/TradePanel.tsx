"use client";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface Photo {
  _id: Id<"photos">;
  url: string | null;
  capturedAt: number;
  sessionId: Id<"sessions">;
  capturedBy: Id<"users">;
  storageId: Id<"_storage">;
  isRevealed: boolean;
  tradedTo?: Id<"users">;
  _creationTime: number;
}

interface Trade {
  _id: Id<"trades">;
  fromUserName: string;
  toUserName: string;
  offeredPhotos: Photo[];
  requestedPhotos: Photo[];
  status: "pending" | "accepted" | "rejected";
  isSent: boolean;
  canRespond: boolean;
  createdAt: number;
  sessionId: Id<"sessions">;
  fromUserId: Id<"users">;
  toUserId: Id<"users">;
  offeredPhotoIds?: Id<"photos">[];
  requestedPhotoIds?: Id<"photos">[];
  offeredPhotoId?: Id<"photos">;
  requestedPhotoId?: Id<"photos">;
}

interface TradePanelProps {
  trades: Trade[];
  sessionId: Id<"sessions">;
}

export function TradePanel({ trades }: TradePanelProps) {
  const respondToTrade = useMutation(api.trades.respondToTrade);

  const handleTradeResponse = async (
    tradeId: Id<"trades">,
    accept: boolean
  ) => {
    try {
      await respondToTrade({ tradeId, accept });
      toast.success(accept ? "Trade accepted!" : "Trade rejected");
    } catch (error) {
      toast.error("Failed to respond to trade");
    }
  };

  const pendingTrades = trades.filter((trade) => trade.status === "pending");
  const completedTrades = trades.filter((trade) => trade.status !== "pending");

  if (trades.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No trades yet</p>
        <p className="text-gray-400 text-sm mt-2">
          Start trading by clicking the "Start Trading" button in the photos tab
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Trades */}
      {pendingTrades.length > 0 && (
        <div>
          <h3 className="font-semibold mb-4">
            Pending Trades ({pendingTrades.length})
          </h3>
          <div className="space-y-6">
            {pendingTrades.map((trade) => (
              <div key={trade._id} className="bg-gray-50 p-6 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm">
                    {trade.isSent ? (
                      <span>
                        You offered to trade with{" "}
                        <strong>{trade.toUserName}</strong>
                      </span>
                    ) : (
                      <span>
                        <strong>{trade.fromUserName}</strong> wants to trade
                        with you
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(trade.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Offered Photos */}
                  <div>
                    <p className="text-sm font-medium text-blue-700 mb-2">
                      Offering ({trade.offeredPhotos.length} photo
                      {trade.offeredPhotos.length !== 1 ? "s" : ""}):
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {trade.offeredPhotos.map((photo) => (
                        <div key={photo._id} className="relative">
                          {photo.url ? (
                            <img
                              src={photo.url}
                              alt="Offered photo"
                              className="w-full h-24 object-cover rounded border-2 border-blue-200"
                            />
                          ) : (
                            <div className="w-full h-24 bg-gray-200 rounded flex items-center justify-center border-2 border-blue-200">
                              <span className="text-gray-400 text-xs">
                                Loading...
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Requested Photos */}
                  <div>
                    <p className="text-sm font-medium text-green-700 mb-2">
                      For ({trade.requestedPhotos.length} photo
                      {trade.requestedPhotos.length !== 1 ? "s" : ""}):
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {trade.requestedPhotos.map((photo) => (
                        <div key={photo._id} className="relative">
                          {photo.url ? (
                            <img
                              src={photo.url}
                              alt="Requested photo"
                              className="w-full h-24 object-cover rounded border-2 border-green-200"
                            />
                          ) : (
                            <div className="w-full h-24 bg-gray-200 rounded flex items-center justify-center border-2 border-green-200">
                              <span className="text-gray-400 text-xs">
                                Loading...
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Trade Actions */}
                {trade.canRespond && (
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => handleTradeResponse(trade._id, true)}
                      className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-medium"
                    >
                      Accept Trade
                    </button>
                    <button
                      onClick={() => handleTradeResponse(trade._id, false)}
                      className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 font-medium"
                    >
                      Reject Trade
                    </button>
                  </div>
                )}

                {trade.isSent && !trade.canRespond && (
                  <div className="mt-4 text-center">
                    <span className="text-sm text-gray-500 bg-yellow-100 px-3 py-1 rounded-full">
                      Waiting for response...
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Trades */}
      {completedTrades.length > 0 && (
        <div>
          <h3 className="font-semibold mb-4">
            Trade History ({completedTrades.length})
          </h3>
          <div className="space-y-4">
            {completedTrades.map((trade) => (
              <div
                key={trade._id}
                className="bg-gray-50 p-4 rounded-lg opacity-75"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm">
                    {trade.isSent ? (
                      <span>
                        Trade with <strong>{trade.toUserName}</strong>
                      </span>
                    ) : (
                      <span>
                        Trade with <strong>{trade.fromUserName}</strong>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        trade.status === "accepted"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {trade.status}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(trade.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">
                      Offered ({trade.offeredPhotos.length}):
                    </p>
                    <div className="grid grid-cols-3 gap-1">
                      {trade.offeredPhotos.slice(0, 3).map((photo) => (
                        <div key={photo._id}>
                          {photo.url ? (
                            <img
                              src={photo.url}
                              alt="Offered photo"
                              className="w-full h-16 object-cover rounded"
                            />
                          ) : (
                            <div className="w-full h-16 bg-gray-200 rounded"></div>
                          )}
                        </div>
                      ))}
                      {trade.offeredPhotos.length > 3 && (
                        <div className="w-full h-16 bg-gray-300 rounded flex items-center justify-center">
                          <span className="text-xs text-gray-600">
                            +{trade.offeredPhotos.length - 3}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-600 mb-1">
                      For ({trade.requestedPhotos.length}):
                    </p>
                    <div className="grid grid-cols-3 gap-1">
                      {trade.requestedPhotos.slice(0, 3).map((photo) => (
                        <div key={photo._id}>
                          {photo.url ? (
                            <img
                              src={photo.url}
                              alt="Requested photo"
                              className="w-full h-16 object-cover rounded"
                            />
                          ) : (
                            <div className="w-full h-16 bg-gray-200 rounded"></div>
                          )}
                        </div>
                      ))}
                      {trade.requestedPhotos.length > 3 && (
                        <div className="w-full h-16 bg-gray-300 rounded flex items-center justify-center">
                          <span className="text-xs text-gray-600">
                            +{trade.requestedPhotos.length - 3}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
