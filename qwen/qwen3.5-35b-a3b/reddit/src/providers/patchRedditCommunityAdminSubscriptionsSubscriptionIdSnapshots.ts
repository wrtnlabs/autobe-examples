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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditCommunitySubscriptionSnapshotAtSummaryTransformer } from "../transformers/RedditCommunitySubscriptionSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityAdminSubscriptionsSubscriptionIdSnapshots(props: {
  admin: AdminPayload;
  subscriptionId: string & tags.Format<"uuid">;
  body: IRedditCommunitySubscription.ISnapshotRequest;
}): Promise<IPageIRedditCommunitySubscriptionSnapshot.ISummary> {
  await MyGlobal.prisma.reddit_community_subscriptions.findUniqueOrThrow({
    where: { id: props.subscriptionId },
  });
  const limit = 50;
  const page = 1;
  const whereClause: Prisma.reddit_community_subscriptions_snapshotsWhereInput =
    {
      reddit_community_subscription_id: props.subscriptionId,
      ...(props.body.userId !== undefined && { user_id: props.body.userId }),
      ...(props.body.communityId !== undefined && {
        community_id: props.body.communityId,
      }),
      ...(props.body.createdAtAfter !== undefined && {
        created_at: { gte: props.body.createdAtAfter },
      }),
      ...(props.body.createdAtBefore !== undefined && {
        created_at: { lte: props.body.createdAtBefore },
      }),
      ...(props.body.snapshotCreatedAtAfter !== undefined && {
        snapshot_created_at: { gte: props.body.snapshotCreatedAtAfter },
      }),
      ...(props.body.snapshotCreatedAtBefore !== undefined && {
        snapshot_created_at: { lte: props.body.snapshotCreatedAtBefore },
      }),
      ...(props.body.status !== undefined && {
        subscription: { status: props.body.status },
      }),
      ...(props.body.search !== undefined && {
        OR: [
          { user_id: props.body.search },
          { community_id: props.body.search },
        ],
      }),
    };
  const sortField = (props.body.sort ?? "snapshotCreatedAt") satisfies
    | "createdAt"
    | "updatedAt"
    | "snapshotCreatedAt";
  const sortOrder = (props.body.sortOrder ?? "desc") satisfies "asc" | "desc";
  const orderByMap = {
    createdAt: "created_at",
    updatedAt: "updated_at",
    snapshotCreatedAt: "snapshot_created_at",
  };
  const orderField = orderByMap[sortField];
  const orderByClause = {
    [orderField]: sortOrder,
  } satisfies Prisma.reddit_community_subscriptions_snapshotsOrderByWithRelationInput;
  const cursor =
    props.body.cursor !== undefined
      ? {
          id: props.body.cursor,
          reddit_community_subscription_id: props.subscriptionId,
        }
      : undefined;
  const records =
    await MyGlobal.prisma.reddit_community_subscriptions_snapshots.findMany({
      where: whereClause,
      orderBy: orderByClause,
      take: limit + 1,
      cursor,
      ...RedditCommunitySubscriptionSnapshotAtSummaryTransformer.select(),
    });
  const hasMore = records.length > limit;
  const data = hasMore ? records.slice(0, limit) : records;
  const totalCount =
    await MyGlobal.prisma.reddit_community_subscriptions_snapshots.count({
      where: whereClause,
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: totalCount,
      pages: Math.ceil(totalCount / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      RedditCommunitySubscriptionSnapshotAtSummaryTransformer.transform,
    ),
  };
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
// export async function patchRedditCommunityAdminSubscriptionsSubscriptionIdSnapshots(props: {
//   admin: AdminPayload;
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