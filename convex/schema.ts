import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  sessions: defineTable({
    name: v.string(),
    hostId: v.id("users"),
    status: v.union(v.literal("active"), v.literal("revealed"), v.literal("ended")),
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
    capturedBy: v.id("users"),
    storageId: v.id("_storage"),
    isRevealed: v.boolean(),
    capturedAt: v.number(),
    tradedTo: v.optional(v.id("users")),
  })
    .index("by_session", ["sessionId"])
    .index("by_capturer", ["capturedBy"])
    .index("by_session_revealed", ["sessionId", "isRevealed"]),

  trades: defineTable({
    sessionId: v.id("sessions"),
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    // New multi-photo fields
    offeredPhotoIds: v.optional(v.array(v.id("photos"))),
    requestedPhotoIds: v.optional(v.array(v.id("photos"))),
    // Legacy single-photo fields for backward compatibility
    offeredPhotoId: v.optional(v.id("photos")),
    requestedPhotoId: v.optional(v.id("photos")),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("rejected")),
    createdAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_to_user", ["toUserId"])
    .index("by_from_user", ["fromUserId"]),

  userStats: defineTable({
    userId: v.id("users"),
    totalPhotos: v.number(),
    totalTrades: v.number(),
    sessionsAttended: v.number(),
    badges: v.array(v.string()),
  }).index("by_user", ["userId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
