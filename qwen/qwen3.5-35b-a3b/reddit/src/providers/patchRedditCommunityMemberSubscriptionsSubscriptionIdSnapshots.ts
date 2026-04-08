import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunitySubscriptionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySubscriptionSnapshot";
import { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { IRedditCommunitySubscriptionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscriptionSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunitySubscriptionSnapshotAtSummaryTransformer } from "../transformers/RedditCommunitySubscriptionSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMemberSubscriptionsSubscriptionIdSnapshots(props: {
  member: MemberPayload;
  subscriptionId: string & tags.Format<"uuid">;
  body: IRedditCommunitySubscription.ISnapshotRequest;
}): Promise<IPageIRedditCommunitySubscriptionSnapshot.ISummary> {
  // Validate subscription exists and belongs to authenticated member
  const subscription =
    await MyGlobal.prisma.reddit_community_subscriptions.findUniqueOrThrow({
      where: {
        id: props.subscriptionId,
        reddit_community_member_id: props.member.id,
      },
      select: { id: true },
    });
  const { body } = props;
  // Build where clause for snapshots
  const whereInput: Prisma.reddit_community_subscriptions_snapshotsWhereInput =
    {
      reddit_community_subscription_id: props.subscriptionId,
    };
  // Apply optional filters
  if (body.userId !== undefined) {
    whereInput.user_id = body.userId;
  }
  if (body.communityId !== undefined) {
    whereInput.community_id = body.communityId;
  }
  if (body.status !== undefined) {
    whereInput.subscription = {
      status: body.status,
    };
  }
  if (body.createdAtAfter !== undefined) {
    const createdAtAfter = new Date(body.createdAtAfter);
    whereInput.created_at = { gte: createdAtAfter };
  }
  if (body.createdAtBefore !== undefined) {
    const createdAtBefore = new Date(body.createdAtBefore);
    whereInput.created_at = { lte: createdAtBefore };
  }
  if (body.snapshotCreatedAtAfter !== undefined) {
    const snapshotCreatedAtAfter = new Date(body.snapshotCreatedAtAfter);
    whereInput.snapshot_created_at = { gte: snapshotCreatedAtAfter };
  }
  if (body.snapshotCreatedAtBefore !== undefined) {
    const snapshotCreatedAtBefore = new Date(body.snapshotCreatedAtBefore);
    whereInput.snapshot_created_at = { lte: snapshotCreatedAtBefore };
  }
  // Determine sort field
  const sortField = body.sort ?? "createdAt";
  const sortOrder = body.sortOrder ?? "desc";
  // Apply sorting with proper type safety
  const orderByInput: Prisma.reddit_community_subscriptions_snapshotsOrderByWithRelationInput[] =
    [];
  if (sortField === "createdAt") {
    orderByInput.push({ created_at: sortOrder });
  } else if (sortField === "updatedAt") {
    orderByInput.push({ updated_at: sortOrder });
  } else if (sortField === "snapshotCreatedAt") {
    orderByInput.push({
      snapshot_created_at: sortOrder,
    });
  }
  // Determine pagination parameters
  const limit = 100;
  let skip = 0;
  // Handle cursor-based pagination
  if (body.cursor !== undefined && body.cursor !== null) {
    const cursorTimestamp = body.cursor;
    const cursorDate = new Date(cursorTimestamp);
    // Count records before cursor for proper pagination
    skip = await MyGlobal.prisma.reddit_community_subscriptions_snapshots.count(
      {
        where: {
          ...whereInput,
          snapshot_created_at: { lt: cursorDate },
        },
      },
    );
  }
  // Query snapshots
  const records =
    await MyGlobal.prisma.reddit_community_subscriptions_snapshots.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit + 1,
      ...RedditCommunitySubscriptionSnapshotAtSummaryTransformer.select(),
    });
  // Check if there are more records
  const hasMore = records.length > limit;
  // Remove extra record if present
  const data = hasMore ? records.slice(0, limit) : records;
  // Get total count
  const total =
    await MyGlobal.prisma.reddit_community_subscriptions_snapshots.count({
      where: whereInput,
    });
  // Calculate pagination
  const currentPage = skip / limit + 1;
  const totalPages = Math.ceil(total / limit);
  // Prepare next cursor for pagination
  let nextCursor: (string & tags.Format<"date-time">) | null = null;
  if (hasMore && data.length === limit) {
    const lastRecord = data[limit - 1];
    nextCursor = toISOStringSafe(lastRecord.snapshot_created_at);
  }
  return {
    pagination: {
      current: currentPage,
      limit,
      records: total,
      pages: totalPages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      RedditCommunitySubscriptionSnapshotAtSummaryTransformer.transform,
    ),
    ...(nextCursor !== null && { next_cursor: nextCursor }),
  } satisfies IPageIRedditCommunitySubscriptionSnapshot.ISummary;
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
// import { IPageIRedditCommunitySubscriptionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySubscriptionSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditCommunitySubscriptionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscriptionSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditCommunityMemberSubscriptionsSubscriptionIdSnapshots(props: {
//   member: MemberPayload;
//   subscriptionId: string & tags.Format<"uuid">;
//   body: IRedditCommunitySubscription.ISnapshotRequest;
// }): Promise<IPageIRedditCommunitySubscriptionSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.reddit_community_subscriptions_snapshots.findMany({
//     ...RedditCommunitySubscriptionSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditCommunitySubscriptionSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------