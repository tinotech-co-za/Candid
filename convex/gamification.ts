import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Badge definitions
const BADGES = {
  SHARP_SHOOTER: "Sharp Shooter",
  MOST_WANTED: "Most Wanted",
  COLLECTOR: "Collector",
} as const;

export const getUserStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const stats = await ctx.db
      .query("userStats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!stats) return null;

    return {
      ...stats,
      badges: stats.badges || [],
    };
  },
});

export const getLeaderboard = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const allStats = await ctx.db.query("userStats").collect();

    // Get user details for each stat entry
    const leaderboard = await Promise.all(
      allStats.map(async (stat) => {
        const user = await ctx.db.get(stat.userId);
        return {
          userId: stat.userId,
          userName: user?.name || user?.email || "Unknown",
          totalPhotos: stat.totalPhotos,
          totalTrades: stat.totalTrades,
          sessionsAttended: stat.sessionsAttended,
          badges: stat.badges || [],
        };
      })
    );

    // Sort by total photos (primary), then by total trades (secondary)
    return leaderboard.sort((a, b) => {
      if (b.totalPhotos !== a.totalPhotos) {
        return b.totalPhotos - a.totalPhotos;
      }
      return b.totalTrades - a.totalTrades;
    });
  },
});

export const calculateAndAssignBadges = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get current user stats
    let userStats = await ctx.db
      .query("userStats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!userStats) {
      const newStatsId = await ctx.db.insert("userStats", {
        userId,
        totalPhotos: 0,
        totalTrades: 0,
        sessionsAttended: 1,
        sessionsHosted: 0,
        photosReceived: 0,
        badges: [],
        lastActivity: Date.now(),
        joinedAt: Date.now(),
      });
      userStats = await ctx.db.get(newStatsId);
    }

    if (!userStats) {
      throw new Error("Failed to create or retrieve user stats");
    }

    const currentBadges = userStats.badges || [];
    const newBadges = [...currentBadges];

    // Calculate Sharp Shooter badge - most photos in any single session
    const userPhotos = await ctx.db
      .query("photos")
      .withIndex("by_original_owner", (q) => q.eq("originalOwnerId", userId))
      .collect();

    // Group photos by session
    const photosBySession = userPhotos.reduce(
      (acc, photo) => {
        if (!acc[photo.sessionId]) {
          acc[photo.sessionId] = [];
        }
        acc[photo.sessionId].push(photo);
        return acc;
      },
      {} as Record<string, typeof userPhotos>
    );

    // Find session with most photos
    const maxPhotosInSession = Math.max(
      ...Object.values(photosBySession).map((photos) => photos.length)
    );

    // Award Sharp Shooter if more than 5 photos in a session
    if (
      maxPhotosInSession >= 5 &&
      !currentBadges.some((badge) => badge.id === "sharp_shooter")
    ) {
      newBadges.push({
        id: "sharp_shooter",
        name: BADGES.SHARP_SHOOTER,
        earnedAt: Date.now(),
        criteria: `Captured ${maxPhotosInSession} photos in a single session`,
      });
    }

    // Calculate Most Wanted badge - photo traded the most times
    // This would require tracking trade history per photo
    // For now, we'll award it if user has photos that have been traded more than 3 times
    const userOwnedPhotos = await ctx.db
      .query("photos")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();

    let maxTradesForPhoto = 0;
    for (const photo of userOwnedPhotos) {
      // Use the tradeCount field which tracks how many times this photo has been traded
      maxTradesForPhoto = Math.max(maxTradesForPhoto, photo.tradeCount);
    }

    if (
      maxTradesForPhoto >= 3 &&
      !currentBadges.some((badge) => badge.id === "most_wanted")
    ) {
      newBadges.push({
        id: "most_wanted",
        name: BADGES.MOST_WANTED,
        earnedAt: Date.now(),
        criteria: `Photo traded ${maxTradesForPhoto} times`,
      });
    }

    // Calculate Collector badge - traded for the most photos
    if (
      userStats.totalTrades >= 10 &&
      !currentBadges.some((badge) => badge.id === "collector")
    ) {
      newBadges.push({
        id: "collector",
        name: BADGES.COLLECTOR,
        earnedAt: Date.now(),
        criteria: `Completed ${userStats.totalTrades} successful trades`,
      });
    }

    // Update user stats with new badges
    if (newBadges.length > currentBadges.length) {
      await ctx.db.patch(userStats._id, {
        badges: newBadges,
      });
    }

    return newBadges;
  },
});

export const refreshAllUserStats = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all users
    const users = await ctx.db.query("userStats").collect();

    for (const userStat of users) {
      // Recalculate photos count
      const userPhotos = await ctx.db
        .query("photos")
        .withIndex("by_original_owner", (q) =>
          q.eq("originalOwnerId", userStat.userId)
        )
        .collect();

      // Recalculate trades count
      const sentTrades = await ctx.db
        .query("trades")
        .withIndex("by_from_user", (q) => q.eq("fromUserId", userStat.userId))
        .filter((q) => q.eq(q.field("status"), "accepted"))
        .collect();

      const receivedTrades = await ctx.db
        .query("trades")
        .withIndex("by_to_user", (q) => q.eq("toUserId", userStat.userId))
        .filter((q) => q.eq(q.field("status"), "accepted"))
        .collect();

      const totalTrades = sentTrades.length + receivedTrades.length;

      // Calculate sessions attended
      const sessionsAttended = new Set(userPhotos.map((p) => p.sessionId)).size;

      await ctx.db.patch(userStat._id, {
        totalPhotos: userPhotos.length,
        totalTrades,
        sessionsAttended,
      });
    }

    return { success: true };
  },
});
