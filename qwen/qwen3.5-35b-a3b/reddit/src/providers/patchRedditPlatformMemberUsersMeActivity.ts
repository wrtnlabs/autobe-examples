import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformPostAtSummaryTransformer } from "../transformers/RedditPlatformPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMemberUsersMeActivity(props: {
  member: MemberPayload;
  body: IRedditPlatformPost.IRequest;
}): Promise<IPageIRedditPlatformPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  if (skip < 0) {
    throw new HttpException("Invalid page number", 400);
  }
  // Step 1: Get subscribed communities for authenticated member
  const subscribedCommunities =
    await MyGlobal.prisma.reddit_platform_subscriptions.findMany({
      where: {
        user_id: props.member.id,
        deleted_at: null,
      },
      select: { community_id: true },
    });
  const communityIds = subscribedCommunities.map((s) => s.community_id);
  // Return empty page if user is not subscribed to any community
  if (communityIds.length === 0) {
    return {
      pagination: {
        current: page,
        limit: limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
      data: [],
    };
  }
  // Step 2: Build WHERE clause for posts from subscribed communities
  const whereInput: Prisma.reddit_platform_postsWhereInput = {
    deleted_at: null,
    community: {
      deleted_at: null,
    },
    community_id: {
      in: communityIds,
    },
  };
  // Step 4: Build ORDER BY based on sort parameter
  const sort = props.body.sort ?? "new";
  const orderByInput: Prisma.reddit_platform_postsOrderByWithRelationInput[] =
    buildOrderByInput(sort);
  // Step 5: Apply time range filter for top and controversial sorts
  if (
    (sort === "top" || sort === "controversial") &&
    props.body.topTimeRange !== "all"
  ) {
    const timeRange = props.body.topTimeRange;
    if (timeRange) {
      const timeRangeFilter = getTimeRangeFilter(timeRange);
      whereInput.created_at = { gte: timeRangeFilter };
    }
  }
  // Step 6: Query posts with pagination
  const records = await MyGlobal.prisma.reddit_platform_posts.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...RedditPlatformPostAtSummaryTransformer.select(),
  });
  // Step 7: Get total count for pagination metadata
  const total = await MyGlobal.prisma.reddit_platform_posts.count({
    where: whereInput,
  });
  // Step 8: Transform results and return paginated response
  const data = await ArrayUtil.asyncMap(
    records,
    RedditPlatformPostAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  };
}
function buildOrderByInput(
  sort: "hot" | "new" | "top" | "controversial",
): Prisma.reddit_platform_postsOrderByWithRelationInput[] {
  switch (sort) {
    case "hot":
      return [{ upvotes_count: "desc" }, { created_at: "desc" }];
    case "new":
      return [{ created_at: "desc" }];
    case "top":
      return [{ upvotes_count: "desc" }];
    case "controversial":
      return [
        {
          upvotes_count: "desc",
          downvotes_count: "asc",
        },
      ];
    default:
      return [{ created_at: "desc" }];
  }
}
function getTimeRangeFilter(
  range: "today" | "week" | "month" | "year",
): string & tags.Format<"date-time"> {
  const now = new Date();
  let hoursAgo: number;
  switch (range) {
    case "today":
      hoursAgo = 24;
      break;
    case "week":
      hoursAgo = 7 * 24;
      break;
    case "month":
      hoursAgo = 30 * 24;
      break;
    case "year":
      hoursAgo = 365 * 24;
      break;
    default:
      hoursAgo = 0;
  }
  const cutoffDate = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
  return toISOStringSafe(cutoffDate);
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
// import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
// import { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditPlatformMemberUsersMeActivity(props: {
//   member: MemberPayload;
//   body: IRedditPlatformPost.IRequest;
// }): Promise<IPageIRedditPlatformPost.ISummary> {
//   const records = await MyGlobal.prisma.reddit_platform_posts.findMany({
//     ...RedditPlatformPostAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditPlatformPostAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------