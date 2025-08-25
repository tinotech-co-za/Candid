import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Please sign in to upload photos");

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
    if (!userId) throw new Error("Please sign in to capture photos");

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

    if (!participation)
      throw new Error("You're not a participant in this session");

    const photoId = await ctx.db.insert("photos", {
      sessionId: args.sessionId,
      originalOwnerId: userId,
      ownerId: userId, // Initially owned by the capturer
      storageId: args.storageId,
      isRevealed: false,
      capturedAt: Date.now(),
      tradeCount: 0,
    });

    // Update user stats
    const stats = await ctx.db
      .query("userStats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (stats) {
      await ctx.db.patch(stats._id, {
        totalPhotos: stats.totalPhotos + 1,
        lastActivity: Date.now(),
      });
    } else {
      await ctx.db.insert("userStats", {
        userId,
        totalPhotos: 1,
        totalTrades: 0,
        sessionsAttended: 1,
        sessionsHosted: 0,
        photosReceived: 0,
        badges: [],
        lastActivity: Date.now(),
        joinedAt: Date.now(),
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
    if (!userId) return []; // Return empty array for unauthenticated users

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    // Check if user is participant
    const participation = await ctx.db
      .query("sessionParticipants")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    if (!participation) return []; // Return empty array for non-participants

    const photos = await ctx.db
      .query("photos")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    // Only show revealed photos or photos taken by the user
    const visiblePhotos = photos.filter(
      (photo) => photo.isRevealed || photo.originalOwnerId === userId
    );

    const photosWithDetails = await Promise.all(
      visiblePhotos.map(async (photo) => {
        const url = await ctx.storage.getUrl(photo.storageId);
        const originalOwner = await ctx.db.get(photo.originalOwnerId);
        const currentOwner = await ctx.db.get(photo.ownerId);

        return {
          ...photo,
          url,
          capturerName:
            originalOwner?.name || originalOwner?.email || "Unknown",
          ownerName: currentOwner?.name || currentOwner?.email || "Unknown",
          ownerId: photo.ownerId,
          canTrade: photo.isRevealed && photo.ownerId !== userId,
        };
      })
    );

    return photosWithDetails;
  },
});

export const getUserGallery = query({
  args: {},
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Get all photos owned by the user
    const userPhotos = await ctx.db
      .query("photos")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();

    // Only include revealed photos
    const revealedPhotos = userPhotos.filter((photo) => photo.isRevealed);

    const photosWithDetails = await Promise.all(
      revealedPhotos.map(async (photo) => {
        const url = await ctx.storage.getUrl(photo.storageId);
        const session = await ctx.db.get(photo.sessionId);
        const originalOwner = await ctx.db.get(photo.originalOwnerId);

        return {
          ...photo,
          url,
          sessionName: session?.name || "Unknown Session",
          capturerName:
            originalOwner?.name || originalOwner?.email || "Unknown",
          capturedAtFormatted: new Date(photo.capturedAt).toLocaleDateString(),
        };
      })
    );

    // Sort by capture date, newest first
    return photosWithDetails.sort((a, b) => b.capturedAt - a.capturedAt);
  },
});
