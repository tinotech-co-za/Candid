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
        sessionsAttended: 0,
        badges: [],
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
      .withIndex("by_capturer", (q) => q.eq("capturedBy", userId))
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
      !currentBadges.includes(BADGES.SHARP_SHOOTER)
    ) {
      newBadges.push(BADGES.SHARP_SHOOTER);
    }

    // Calculate Most Wanted badge - photo traded the most times
    // This would require tracking trade history per photo
    // For now, we'll award it if user has photos that have been traded more than 3 times
    const userOwnedPhotos = await ctx.db
      .query("photos")
      .filter((q) =>
        q.or(
          q.eq(q.field("capturedBy"), userId),
          q.eq(q.field("tradedTo"), userId)
        )
      )
      .collect();

    let maxTradesForPhoto = 0;
    for (const photo of userOwnedPhotos) {
      // Count trades involving this photo
      const tradesInvolvingPhoto = await ctx.db
        .query("trades")
        .filter((q) =>
          q.or(
            q.eq(q.field("offeredPhotoId"), photo._id),
            q.eq(q.field("requestedPhotoId"), photo._id),
            ...(photo._id
              ? [
                  q.neq(q.field("offeredPhotoIds"), null),
                  q.neq(q.field("requestedPhotoIds"), null),
                ]
              : [])
          )
        )
        .collect();

      // Check multi-photo trades
      const multiPhotoTrades = tradesInvolvingPhoto.filter(
        (trade) =>
          trade.offeredPhotoIds?.includes(photo._id) ||
          trade.requestedPhotoIds?.includes(photo._id)
      );

      const totalTrades = tradesInvolvingPhoto.length + multiPhotoTrades.length;
      maxTradesForPhoto = Math.max(maxTradesForPhoto, totalTrades);
    }

    if (maxTradesForPhoto >= 3 && !currentBadges.includes(BADGES.MOST_WANTED)) {
      newBadges.push(BADGES.MOST_WANTED);
    }

    // Calculate Collector badge - traded for the most photos
    if (
      userStats.totalTrades >= 10 &&
      !currentBadges.includes(BADGES.COLLECTOR)
    ) {
      newBadges.push(BADGES.COLLECTOR);
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
        .withIndex("by_capturer", (q) => q.eq("capturedBy", userStat.userId))
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
