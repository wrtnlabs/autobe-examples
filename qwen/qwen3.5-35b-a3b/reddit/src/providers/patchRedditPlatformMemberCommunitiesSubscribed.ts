import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformSubscription";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSubscription";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformSubscriptionAtSummaryTransformer } from "../transformers/RedditPlatformSubscriptionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMemberCommunitiesSubscribed(props: {
  member: MemberPayload;
  body: IRedditPlatformSubscription.IRequest;
}): Promise<IPageIRedditPlatformSubscription.ISummary> {
  // Parse pagination parameters with validation
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  // Validate pagination parameters
  if (page < 1) {
    throw new HttpException("Page number must be at least 1", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  const skip = (page - 1) * limit;
  // Parse sort parameters with defaults
  const sortBy = props.body.sort_by ?? "subscribed_at";
  const order = (
    props.body.sort_order === "asc" || props.body.sort_order === "desc"
      ? props.body.sort_order
      : "desc"
  ) as "asc" | "desc";
  // Validate sort field
  const validSortFields = ["subscribed_at", "created_at", "name"] as const;
  if (!validSortFields.includes(sortBy as (typeof validSortFields)[number])) {
    throw new HttpException("Invalid sort field", 400);
  }
  // Build order by clause
  const orderByInput: Prisma.reddit_platform_subscriptionsOrderByWithRelationInput[] =
    (() => {
      switch (sortBy) {
        case "subscribed_at":
          return [
            { subscribed_at: order },
          ] as Prisma.reddit_platform_subscriptionsOrderByWithRelationInput[];
        case "created_at":
          return [
            { created_at: order },
          ] as Prisma.reddit_platform_subscriptionsOrderByWithRelationInput[];
        case "name":
          return [
            { community: { name: order } },
          ] as Prisma.reddit_platform_subscriptionsOrderByWithRelationInput[];
        default:
          return [
            { subscribed_at: "desc" },
          ] as Prisma.reddit_platform_subscriptionsOrderByWithRelationInput[];
      }
    })();
  // Build where clause for subscriptions
  const whereInput: Prisma.reddit_platform_subscriptionsWhereInput = {
    user_id: props.member.id,
    deleted_at: null,
    ...(props.body.search && {
      community: {
        OR: [
          {
            name: {
              contains: props.body.search,
              mode: "insensitive",
            },
          },
          {
            description: {
              contains: props.body.search,
              mode: "insensitive",
            },
          },
        ],
      },
    }),
    ...(props.body.community_id && {
      community_id: props.body.community_id,
    }),
    ...(props.body.community_name && {
      community: {
        name: {
          contains: props.body.community_name,
          mode: "insensitive",
        },
      },
    }),
    ...(props.body.subscribed_at_gte && {
      subscribed_at: { gte: new Date(props.body.subscribed_at_gte) },
    }),
    ...(props.body.subscribed_at_lte && {
      subscribed_at: { lte: new Date(props.body.subscribed_at_lte) },
    }),
  };
  // Execute query
  const [records, total] = await Promise.all([
    MyGlobal.prisma.reddit_platform_subscriptions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...RedditPlatformSubscriptionAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_platform_subscriptions.count({
      where: whereInput,
    }),
  ]);
  // Calculate pagination metadata
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: total === 0 ? 0 : Math.ceil(total / limit),
  } satisfies IPage.IPagination;
  // Transform and return
  return {
    pagination,
    data: await ArrayUtil.asyncMap(
      records,
      RedditPlatformSubscriptionAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditPlatformSubscription.ISummary;
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
// import { IRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSubscription";
// import { IPageIRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformSubscription";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditPlatformMemberCommunitiesSubscribed(props: {
//   member: MemberPayload;
//   body: IRedditPlatformSubscription.IRequest;
// }): Promise<IPageIRedditPlatformSubscription.ISummary> {
//   const records = await MyGlobal.prisma.reddit_platform_subscriptions.findMany({
//     ...RedditPlatformSubscriptionAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditPlatformSubscriptionAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------