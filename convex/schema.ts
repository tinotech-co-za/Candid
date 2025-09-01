import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  events: defineTable({
    displayName: v.string(),
    hostId: v.id("users"),
    description: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    coverUrl: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_host", ["hostId"]),
  eventParticipants: defineTable({
    eventId: v.id("events"),
    userId: v.id("users"),
    displayName: v.string(),
    avatarUrl: v.optional(v.string()),
    payshapOrBank: v.optional(v.string()),
    joinedAt: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_user", ["userId"]),
  expenses: defineTable({
    eventId: v.id("events"),
    description: v.string(),
    amountCents: v.number(),
    currency: v.string(),
    paidById: v.array(v.id("users")),
    createdAt: v.number(),
    createdBy: v.id("users"),
    attachedPhotoId: v.optional(v.id("photos")),
  }).index("by_event", ["eventId"]),
  expenseShares: defineTable({
    expenseId: v.id("expenses"),
    userId: v.id("users"),
    shareCents: v.number(),
    settled: v.boolean(),
    settledAt: v.optional(v.number()),
    settledBy: v.optional(v.id("users")),
  })
    .index("by_expense", ["expenseId"])
    .index("by_user", ["userId"]),
  simplifiedDebts: defineTable({
    eventId: v.id("events"),
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    amountCents: v.number(),
  })
    .index("by_from_user", ["fromUserId"])
    .index("by_to_user", ["toUserId"]),
  sessions: defineTable({
    name: v.string(),
    hostId: v.id("users"),
    status: v.union(
      v.literal("active"),
      v.literal("revealed"),
      v.literal("ended")
    ),
    revealTime: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_host", ["hostId"]),

  sessionParticipants: defineTable({
    sessionId: v.id("sessions"),
    userId: v.id("users"),
    joinedAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_user", ["userId"]),

  photos: defineTable({
    sessionId: v.id("sessions"),
    originalOwnerId: v.id("users"), // Who originally captured the photo
    ownerId: v.id("users"), // Current owner (simplified from tradedTo)
    storageId: v.id("_storage"),
    isRevealed: v.boolean(),
    capturedAt: v.number(),
    fileSize: v.optional(v.number()), // File size in bytes
    width: v.optional(v.number()), // Original image width
    height: v.optional(v.number()), // Original image height
    tradeCount: v.number(), // How many times this photo has been traded
  })
    .index("by_session", ["sessionId"])
    .index("by_owner", ["ownerId"])
    .index("by_original_owner", ["originalOwnerId"])
    .index("by_session_revealed", ["sessionId", "isRevealed"])
    .index("by_session_owner", ["sessionId", "ownerId"]),

  trades: defineTable({
    sessionId: v.id("sessions"),
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    offeredPhotoIds: v.array(v.id("photos")),
    requestedPhotoIds: v.array(v.id("photos")),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("rejected")
    ),
    createdAt: v.number(),
    completedAt: v.optional(v.number()), // When trade was completed
  })
    .index("by_session", ["sessionId"])
    .index("by_to_user", ["toUserId"])
    .index("by_from_user", ["fromUserId"])
    .index("by_status", ["status"])
    .index("by_created_at", ["createdAt"]),

  photoTransfers: defineTable({
    photoId: v.id("photos"),
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    tradeId: v.id("trades"), // Which trade caused this transfer
    transferredAt: v.number(),
  })
    .index("by_photo", ["photoId"])
    .index("by_trade", ["tradeId"])
    .index("by_from_user", ["fromUserId"])
    .index("by_to_user", ["toUserId"]),

  userStats: defineTable({
    userId: v.id("users"),
    totalPhotos: v.number(), // Photos captured by user
    totalTrades: v.number(), // Successful trades participated in
    sessionsAttended: v.number(), // Sessions joined
    sessionsHosted: v.number(), // Sessions created as host
    photosReceived: v.number(), // Photos received through trades
    badges: v.array(
      v.object({
        id: v.string(), // Badge identifier
        name: v.string(), // Display name
        earnedAt: v.number(), // When badge was earned
        criteria: v.optional(v.string()), // How it was earned
      })
    ),
    lastActivity: v.number(), // Timestamp of last activity
    joinedAt: v.number(), // When user first joined
  })
    .index("by_user", ["userId"])
    .index("by_total_photos", ["totalPhotos"])
    .index("by_total_trades", ["totalTrades"])
    .index("by_last_activity", ["lastActivity"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
