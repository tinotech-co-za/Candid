import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const createTrade = mutation({
  args: {
    sessionId: v.id("sessions"),
    toUserId: v.id("users"),
    offeredPhotoIds: v.array(v.id("photos")),
    requestedPhotoIds: v.array(v.id("photos")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.status !== "revealed") {
      throw new Error("Session not found or not in reveal phase");
    }

    // Verify all offered photos belong to user
    for (const photoId of args.offeredPhotoIds) {
      const photo = await ctx.db.get(photoId);
      if (!photo || photo.ownerId !== userId) {
        throw new Error("You don't own one of the offered photos");
      }
    }

    // Verify all requested photos belong to target user
    for (const photoId of args.requestedPhotoIds) {
      const photo = await ctx.db.get(photoId);
      if (!photo || photo.ownerId !== args.toUserId) {
        throw new Error("Target user doesn't own one of the requested photos");
      }
    }

    const tradeId = await ctx.db.insert("trades", {
      sessionId: args.sessionId,
      fromUserId: userId,
      toUserId: args.toUserId,
      offeredPhotoIds: args.offeredPhotoIds,
      requestedPhotoIds: args.requestedPhotoIds,
      status: "pending",
      createdAt: Date.now(),
    });

    return tradeId;
  },
});

export const respondToTrade = mutation({
  args: {
    tradeId: v.id("trades"),
    accept: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const trade = await ctx.db.get(args.tradeId);
    if (!trade) throw new Error("Trade not found");

    if (trade.toUserId !== userId) {
      throw new Error("Not authorized to respond to this trade");
    }

    if (trade.status !== "pending") {
      throw new Error("Trade already responded to");
    }

    const newStatus = args.accept ? "accepted" : "rejected";
    await ctx.db.patch(args.tradeId, { status: newStatus });

    if (args.accept) {
      // Execute the trade - swap photo ownership and create transfer records
      for (const photoId of trade.offeredPhotoIds) {
        const photo = await ctx.db.get(photoId);
        if (photo) {
          await ctx.db.patch(photoId, {
            ownerId: trade.toUserId,
            tradeCount: photo.tradeCount + 1,
          });

          // Create transfer record
          await ctx.db.insert("photoTransfers", {
            photoId,
            fromUserId: trade.fromUserId,
            toUserId: trade.toUserId,
            tradeId: trade._id,
            transferredAt: Date.now(),
          });
        }
      }

      for (const photoId of trade.requestedPhotoIds) {
        const photo = await ctx.db.get(photoId);
        if (photo) {
          await ctx.db.patch(photoId, {
            ownerId: trade.fromUserId,
            tradeCount: photo.tradeCount + 1,
          });

          // Create transfer record
          await ctx.db.insert("photoTransfers", {
            photoId,
            fromUserId: trade.toUserId,
            toUserId: trade.fromUserId,
            tradeId: trade._id,
            transferredAt: Date.now(),
          });
        }
      }

      // Update user stats
      const fromUserStats = await ctx.db
        .query("userStats")
        .withIndex("by_user", (q) => q.eq("userId", trade.fromUserId))
        .first();

      const toUserStats = await ctx.db
        .query("userStats")
        .withIndex("by_user", (q) => q.eq("userId", trade.toUserId))
        .first();

      if (fromUserStats) {
        await ctx.db.patch(fromUserStats._id, {
          totalTrades: fromUserStats.totalTrades + 1,
          photosReceived:
            fromUserStats.photosReceived + trade.requestedPhotoIds.length,
          lastActivity: Date.now(),
        });
      }

      if (toUserStats) {
        await ctx.db.patch(toUserStats._id, {
          totalTrades: toUserStats.totalTrades + 1,
          photosReceived:
            toUserStats.photosReceived + trade.offeredPhotoIds.length,
          lastActivity: Date.now(),
        });
      }
    }
  },
});

export const getUserTrades = query({
  args: {
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const sentTrades = await ctx.db
      .query("trades")
      .withIndex("by_from_user", (q) => q.eq("fromUserId", userId))
      .filter((q) => q.eq(q.field("sessionId"), args.sessionId))
      .collect();

    const receivedTrades = await ctx.db
      .query("trades")
      .withIndex("by_to_user", (q) => q.eq("toUserId", userId))
      .filter((q) => q.eq(q.field("sessionId"), args.sessionId))
      .collect();

    const allTrades = [...sentTrades, ...receivedTrades];

    const tradesWithDetails = await Promise.all(
      allTrades.map(async (trade) => {
        const fromUser = await ctx.db.get(trade.fromUserId);
        const toUser = await ctx.db.get(trade.toUserId);

        // Handle multi-photo format (only format supported in new schema)
        let offeredPhotos: any[] = [];
        let requestedPhotos: any[] = [];

        if (trade.offeredPhotoIds && trade.requestedPhotoIds) {
          offeredPhotos = (
            await Promise.all(
              trade.offeredPhotoIds.map(async (photoId) => {
                const photo = await ctx.db.get(photoId);
                if (!photo) return null;
                const url = await ctx.storage.getUrl(photo.storageId);
                return { ...photo, url };
              })
            )
          ).filter(Boolean);

          requestedPhotos = (
            await Promise.all(
              trade.requestedPhotoIds.map(async (photoId) => {
                const photo = await ctx.db.get(photoId);
                if (!photo) return null;
                const url = await ctx.storage.getUrl(photo.storageId);
                return { ...photo, url };
              })
            )
          ).filter(Boolean);
        }

        return {
          ...trade,
          fromUserName: fromUser?.name || fromUser?.email || "Unknown",
          toUserName: toUser?.name || toUser?.email || "Unknown",
          offeredPhotos,
          requestedPhotos,
          isSent: trade.fromUserId === userId,
          canRespond: trade.toUserId === userId && trade.status === "pending",
        };
      })
    );

    return tradesWithDetails;
  },
});
