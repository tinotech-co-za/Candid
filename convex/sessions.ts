import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const createSession = mutation({
  args: {
    name: v.string(),
    revealTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const sessionId = await ctx.db.insert("sessions", {
      name: args.name,
      hostId: userId,
      status: "active",
      revealTime: args.revealTime,
      createdAt: Date.now(),
    });

    // Add host as participant
    await ctx.db.insert("sessionParticipants", {
      sessionId,
      userId,
      joinedAt: Date.now(),
    });

    return sessionId;
  },
});

export const joinSession = mutation({
  args: {
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    if (session.status === "ended") {
      throw new Error("Session has ended");
    }

    // Check if already joined
    const existing = await ctx.db
      .query("sessionParticipants")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    if (existing) return;

    await ctx.db.insert("sessionParticipants", {
      sessionId: args.sessionId,
      userId,
      joinedAt: Date.now(),
    });
  },
});

export const getUserSessions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const participations = await ctx.db
      .query("sessionParticipants")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const sessions = await Promise.all(
      participations.map(async (p) => {
        const session = await ctx.db.get(p.sessionId);
        if (!session) return null;

        const host = await ctx.db.get(session.hostId);
        const participantCount = await ctx.db
          .query("sessionParticipants")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .collect();

        return {
          ...session,
          hostName: host?.name || host?.email || "Unknown",
          participantCount: participantCount.length,
          isHost: session.hostId === userId,
        };
      })
    );

    return sessions.filter(
      (session): session is NonNullable<typeof session> => session !== null
    );
  },
});

export const getSessionDetails = query({
  args: {
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null; // Return null for unauthenticated users

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    // Check if user is participant
    const participation = await ctx.db
      .query("sessionParticipants")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    if (!participation) return null; // Return null for non-participants

    const participants = await ctx.db
      .query("sessionParticipants")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    const participantDetails = await Promise.all(
      participants.map(async (p) => {
        const user = await ctx.db.get(p.userId);
        return {
          id: p.userId,
          name: user?.name || user?.email || "Unknown",
          joinedAt: p.joinedAt,
        };
      })
    );

    const photos = await ctx.db
      .query("photos")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    const photosWithUrls = await Promise.all(
      photos.map(async (photo) => {
        const url = await ctx.storage.getUrl(photo.storageId);
        const capturer = await ctx.db.get(photo.originalOwnerId);
        return {
          ...photo,
          url,
          capturerName: capturer?.name || capturer?.email || "Unknown",
        };
      })
    );

    return {
      ...session,
      participants: participantDetails,
      photos: photosWithUrls,
      isHost: session.hostId === userId,
    };
  },
});

export const revealPhotos = mutation({
  args: {
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Please sign in to reveal photos");

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    if (session.hostId !== userId) {
      throw new Error("Only session hosts can reveal photos");
    }

    // Update session status
    await ctx.db.patch(args.sessionId, {
      status: "revealed",
    });

    // Reveal all photos
    const photos = await ctx.db
      .query("photos")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    for (const photo of photos) {
      await ctx.db.patch(photo._id, {
        isRevealed: true,
      });
    }
  },
});
