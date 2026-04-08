import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityPostAtSummaryTransformer } from "../transformers/RedditCommunityPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMemberFeedsPopular(props: {
  member: MemberPayload;
  body: IRedditCommunityPost.IRequest;
}): Promise<IPageIRedditCommunityPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause - exclude soft-deleted posts
  const whereClause: Prisma.reddit_community_postsWhereInput = {
    deleted_at: null,
  };
  // Apply time period filter for top sort
  if (props.body.sort === "top" && props.body.timePeriod !== undefined) {
    const now = new Date();
    let timeFilter: string | undefined;
    switch (props.body.timePeriod) {
      case "today":
        timeFilter = toISOStringSafe(
          new Date(now.getTime() - 24 * 60 * 60 * 1000),
        );
        break;
      case "this_week":
        timeFilter = toISOStringSafe(
          new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        );
        break;
      case "this_month":
        timeFilter = toISOStringSafe(
          new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        );
        break;
      case "this_year":
        timeFilter = toISOStringSafe(
          new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
        );
        break;
      case "all_time":
      default:
        break;
    }
    if (timeFilter !== undefined) {
      whereClause.created_at = {
        gte: timeFilter,
      };
    }
  }
  // Build ORDER BY clause based on sort option
  let orderByClause: Prisma.reddit_community_postsOrderByWithRelationInput;
  switch (props.body.sort) {
    case "hot":
      // Hot sort: engagement-based with recency factor
      orderByClause = {
        vote_score: "desc",
        created_at: "desc",
      };
      break;
    case "new":
      orderByClause = {
        created_at: "desc",
      };
      break;
    case "top":
      // Top sort: highest vote scores
      orderByClause = {
        vote_score: "desc",
      };
      break;
    case "controversial":
      // Controversial sort: posts with score near zero (most negative first)
      orderByClause = {
        vote_score: "asc",
      };
      break;
    default:
      // Default to hot sort
      orderByClause = {
        vote_score: "desc",
        created_at: "desc",
      };
  }
  // Fetch paginated posts
  const data = await MyGlobal.prisma.reddit_community_posts.findMany({
    where: whereClause,
    orderBy: orderByClause,
    skip: skip,
    take: limit,
    ...RedditCommunityPostAtSummaryTransformer.select(),
  });
  // Count total records for pagination
  const total = await MyGlobal.prisma.reddit_community_posts.count({
    where: whereClause,
  });
  // Transform data and build response
  const result = {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      data,
      RedditCommunityPostAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditCommunityPost.ISummary;
  return result;
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
// import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
// import { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
// import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditCommunityMemberFeedsPopular(props: {
//   member: MemberPayload;
//   body: IRedditCommunityPost.IRequest;
// }): Promise<IPageIRedditCommunityPost.ISummary> {
//   const records = await MyGlobal.prisma.reddit_community_posts.findMany({
//     ...RedditCommunityPostAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditCommunityPostAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------