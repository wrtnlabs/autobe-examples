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

export async function patchRedditPlatformMemberFeedsHome(props: {
  member: MemberPayload;
  body: IRedditPlatformPost.IRequest;
}): Promise<IPageIRedditPlatformPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "new";
  const topTimeRange = props.body.topTimeRange ?? "all";
  // Get user's subscribed community IDs
  const subscriptions =
    await MyGlobal.prisma.reddit_platform_subscriptions.findMany({
      where: {
        user_id: props.member.id,
        deleted_at: null,
      },
      select: { community_id: true },
    });
  const subscribedCommunityIds = subscriptions.map((s) => s.community_id);
  // Get banned community IDs for this user
  const bannedCommunities =
    await MyGlobal.prisma.reddit_platform_banned_users.findMany({
      where: {
        user_id: props.member.id,
        deleted_at: null,
        unbanned_at: null,
      },
      select: { community_id: true },
    });
  const bannedCommunityIds = bannedCommunities.map((b) => b.community_id);
  // Build where clause for posts
  const whereClause: Prisma.reddit_platform_postsWhereInput = {
    deleted_at: null,
    community_id: {
      in: subscribedCommunityIds.length > 0 ? subscribedCommunityIds : [],
    },
  };
  if (bannedCommunityIds.length > 0) {
    whereClause.community_id = {
      notIn: [...subscribedCommunityIds, ...bannedCommunityIds],
    };
  }
  if (sort === "top" && topTimeRange !== "all") {
    const now = new Date();
    let startDate: Date;
    switch (topTimeRange) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "month":
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case "year":
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate = new Date(0);
        break;
    }
    whereClause.created_at = { gte: startDate };
  }
  const orderBy: Prisma.reddit_platform_postsOrderByWithRelationInput = (() => {
    switch (sort) {
      case "hot":
        return {
          upvotes_count: "desc",
          created_at: "desc",
        };
      case "new":
        return { created_at: "desc" };
      case "top":
        return { upvotes_count: "desc" };
      case "controversial":
        return {
          downvotes_count: "asc",
          upvotes_count: "desc",
        };
      default:
        return { created_at: "desc" };
    }
  })();
  const [posts, total] = await Promise.all([
    MyGlobal.prisma.reddit_platform_posts.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy,
      ...RedditPlatformPostAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_platform_posts.count({
      where: whereClause,
    }),
  ]);
  const data = await ArrayUtil.asyncMap(
    posts,
    RedditPlatformPostAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIRedditPlatformPost.ISummary;
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
// export async function patchRedditPlatformMemberFeedsHome(props: {
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