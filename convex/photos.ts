import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    return await ctx.storage.generateUploadUrl();
  },
});

export const capturePhoto = mutation({
  args: {
    sessionId: v.id("sessions"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    if (session.status !== "active") {
      throw new Error("Session is not active");
    }

    // Check if user is participant
    const participation = await ctx.db
      .query("sessionParticipants")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    if (!participation) throw new Error("Not a participant");

    const photoId = await ctx.db.insert("photos", {
      sessionId: args.sessionId,
      capturedBy: userId,
      storageId: args.storageId,
      isRevealed: false,
      capturedAt: Date.now(),
    });

    // Update user stats
    const stats = await ctx.db
      .query("userStats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (stats) {
      await ctx.db.patch(stats._id, {
        totalPhotos: stats.totalPhotos + 1,
      });
    } else {
      await ctx.db.insert("userStats", {
        userId,
        totalPhotos: 1,
        totalTrades: 0,
        sessionsAttended: 1,
        badges: [],
      });
    }

    return photoId;
  },
});

export const getSessionPhotos = query({
  args: {
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    // Check if user is participant
    const participation = await ctx.db
      .query("sessionParticipants")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    if (!participation) throw new Error("Not a participant");

    const photos = await ctx.db
      .query("photos")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    // Only show revealed photos or photos taken by the user
    const visiblePhotos = photos.filter(
      (photo) => photo.isRevealed || photo.capturedBy === userId
    );

    const photosWithDetails = await Promise.all(
      visiblePhotos.map(async (photo) => {
        const url = await ctx.storage.getUrl(photo.storageId);
        const capturer = await ctx.db.get(photo.capturedBy);
        const owner = photo.tradedTo ? await ctx.db.get(photo.tradedTo) : capturer;
        
        return {
          ...photo,
          url,
          capturerName: capturer?.name || capturer?.email || "Unknown",
          ownerName: owner?.name || owner?.email || "Unknown",
          ownerId: photo.tradedTo || photo.capturedBy,
          canTrade: photo.isRevealed && (photo.tradedTo || photo.capturedBy) !== userId,
        };
      })
    );

    return photosWithDetails;
  },
});
