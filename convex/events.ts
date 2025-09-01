import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const createEvent = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    coverUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const eventId = await ctx.db.insert("events", {
      displayName: args.name,
      description: args.description,
      startTime: args.startTime,
      endTime: args.endTime,
      coverUrl: args.coverUrl,
      hostId: userId,
      createdAt: Date.now(),
    });

    const userIdentity = await ctx.auth.getUserIdentity();

    await ctx.db.insert("eventParticipants", {
      eventId,
      userId,
      displayName: userIdentity?.name || "Anon",
      avatarUrl: userIdentity?.profileUrl || undefined,
      joinedAt: Date.now(),
    });

    return eventId;
  },
});

export const joinEvent = mutation({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // check if member already exists
    const existing = await ctx.db
      .query("eventParticipants")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((m) => m.eq(m.field("userId"), userId))
      .first();
    if (existing) return existing._id;

    const userIdentity = await ctx.auth.getUserIdentity();

    const participant = await ctx.db.insert("eventParticipants", {
      eventId: args.eventId,
      userId,
      displayName: userIdentity?.name || "Anon",
      avatarUrl: userIdentity?.profileUrl || undefined,
      joinedAt: Date.now(),
    });

    return participant;
  },
});
