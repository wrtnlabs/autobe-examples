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
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditCommunityPostAtSummaryTransformer } from "../transformers/RedditCommunityPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityGuestFeedsPopular(props: {
  guest: GuestPayload;
  body: IRedditCommunityPost.IRequest;
}): Promise<IPageIRedditCommunityPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const now = new Date();
  function subtractDays(date: Date, days: number): string {
    const adjusted = new Date(date.getTime());
    adjusted.setDate(adjusted.getDate() - days);
    return adjusted.toISOString();
  }
  // Build where clause incrementally
  const where: Prisma.reddit_community_postsWhereInput = {
    deleted_at: null,
  };
  // Add time period filter for top sort
  if (props.body.sort === "top" && props.body.timePeriod) {
    let threshold: string | undefined;
    switch (props.body.timePeriod) {
      case "today":
        threshold = subtractDays(now, 1);
        break;
      case "this_week":
        threshold = subtractDays(now, 7);
        break;
      case "this_month":
        threshold = subtractDays(now, 30);
        break;
      case "this_year":
        threshold = subtractDays(now, 365);
        break;
      case "all_time":
        threshold = undefined;
        break;
      default:
        threshold = undefined;
    }
    if (threshold !== undefined) {
      where.created_at = { gte: threshold };
    }
  }
  // Add date range filters
  if (props.body.dateFrom || props.body.dateTo) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (props.body.dateFrom) {
      dateFilter.gte = props.body.dateFrom;
    }
    if (props.body.dateTo) {
      dateFilter.lte = props.body.dateTo;
    }
    where.created_at = dateFilter;
  }
  // Add other filters
  if (props.body.postType) {
    where.post_type = props.body.postType;
  }
  if (
    props.body.voteScoreMin !== undefined ||
    props.body.voteScoreMax !== undefined
  ) {
    const voteScoreFilter: Prisma.IntFilter = {};
    if (props.body.voteScoreMin !== undefined) {
      voteScoreFilter.gte = props.body.voteScoreMin;
    }
    if (props.body.voteScoreMax !== undefined) {
      voteScoreFilter.lte = props.body.voteScoreMax;
    }
    where.vote_score = voteScoreFilter;
  }
  if (props.body.communityId) {
    where.reddit_community_community_id = props.body.communityId;
  }
  if (props.body.authorId) {
    where.reddit_community_member_id = props.body.authorId;
  }
  // Build orderBy based on sort parameter
  const orderBy: Prisma.reddit_community_postsOrderByWithRelationInput[] =
    props.body.sort === "new"
      ? [{ created_at: "desc" }]
      : props.body.sort === "top"
        ? [{ vote_score: "desc" }]
        : props.body.sort === "controversial"
          ? [{ vote_score: "asc" }]
          : [{ created_at: "desc" }];
  // Query posts
  const posts = await MyGlobal.prisma.reddit_community_posts.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    ...RedditCommunityPostAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.reddit_community_posts.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      posts,
      RedditCommunityPostAtSummaryTransformer.transform,
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
// import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
// import { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
// import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditCommunityGuestFeedsPopular(props: {
//   guest: GuestPayload;
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