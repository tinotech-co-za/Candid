"use client";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

const BADGE_EMOJIS = {
  "Sharp Shooter": "🎯",
  "Most Wanted": "⭐",
  Collector: "🏆",
};

const getDefaultCriteria = (badgeName: string) => {
  switch (badgeName) {
    case "Sharp Shooter":
      return "Most photos in a session";
    case "Most Wanted":
      return "Photo traded the most";
    case "Collector":
      return "Traded for the most photos";
    default:
      return "";
  }
};

interface GamificationPanelProps {
  sessionId?: Id<"sessions">;
}

export function GamificationPanel({ sessionId }: GamificationPanelProps) {
  const [activeTab, setActiveTab] = useState<"stats" | "leaderboard">("stats");

  const userStats = useQuery(api.gamification.getUserStats);
  const leaderboard = useQuery(api.gamification.getLeaderboard);
  const calculateBadges = useMutation(
    api.gamification.calculateAndAssignBadges
  );

  const handleRefreshBadges = async () => {
    try {
      const newBadges = await calculateBadges();
      if (
        newBadges &&
        userStats?.badges &&
        newBadges.length > userStats.badges.length
      ) {
        const earnedBadges = newBadges.filter(
          (badge) =>
            !userStats.badges.some(
              (existingBadge) => existingBadge.id === badge.id
            )
        );
        const badgeNames = earnedBadges.map((badge) => badge.name);
        toast.success(
          `🎉 You earned new badge${badgeNames.length > 1 ? "s" : ""}: ${badgeNames.join(", ")}!`
        );
      } else {
        toast.success("Badge calculation completed!");
      }
    } catch (error: any) {
      toast.error("Failed to calculate badges");
    }
  };

  if (!userStats) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Loading gamification data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b">
        <nav className="flex">
          <button
            onClick={() => setActiveTab("stats")}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === "stats"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            My Stats
          </button>
          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === "leaderboard"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Leaderboard
          </button>
        </nav>
      </div>

      <div className="p-6">
        {activeTab === "stats" && (
          <div className="space-y-6">
            {/* User Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {userStats.totalPhotos}
                </div>
                <div className="text-sm text-blue-800">Photos Taken</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {userStats.totalTrades}
                </div>
                <div className="text-sm text-green-800">Successful Trades</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {userStats.sessionsAttended}
                </div>
                <div className="text-sm text-purple-800">Sessions Attended</div>
              </div>
            </div>

            {/* Badges */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Your Badges</h3>
                <button
                  onClick={handleRefreshBadges}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                >
                  🔄 Refresh
                </button>
              </div>

              {userStats.badges && userStats.badges.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userStats.badges.map((badge) => (
                    <div
                      key={badge.id}
                      className="bg-gradient-to-r from-yellow-400 to-yellow-600 p-4 rounded-lg text-white"
                    >
                      <div className="text-2xl mb-2">
                        {BADGE_EMOJIS[
                          badge.name as keyof typeof BADGE_EMOJIS
                        ] || "🏅"}
                      </div>
                      <div className="font-semibold">{badge.name}</div>
                      <div className="text-sm opacity-90 mt-1">
                        {badge.criteria || getDefaultCriteria(badge.name)}
                      </div>
                      <div className="text-xs opacity-70 mt-1">
                        Earned {new Date(badge.earnedAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <div className="text-4xl mb-2">🏅</div>
                  <p className="text-gray-600">No badges yet!</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Keep taking photos and trading to earn badges
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "leaderboard" && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Top Players</h3>
            {!leaderboard || leaderboard.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No players yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.slice(0, 10).map((player, index) => (
                  <div
                    key={player.userId}
                    className={`flex items-center justify-between p-4 rounded-lg ${
                      index < 3
                        ? index === 0
                          ? "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white"
                          : index === 1
                            ? "bg-gradient-to-r from-gray-300 to-gray-500 text-white"
                            : "bg-gradient-to-r from-orange-400 to-orange-600 text-white"
                        : "bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          index < 3
                            ? "bg-white bg-opacity-20"
                            : "bg-blue-600 text-white"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{player.userName}</div>
                        <div className="flex gap-1 mt-1">
                          {player.badges.slice(0, 3).map((badge) => (
                            <span key={badge.id} className="text-sm">
                              {BADGE_EMOJIS[
                                badge.name as keyof typeof BADGE_EMOJIS
                              ] || "🏅"}
                            </span>
                          ))}
                          {player.badges.length > 3 && (
                            <span className="text-sm text-gray-500">
                              +{player.badges.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {player.totalPhotos} 📸
                      </div>
                      <div className="text-sm opacity-80">
                        {player.totalTrades} trades
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
