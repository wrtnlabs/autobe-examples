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

export async function patchRedditCommunityMemberHomeFeed(props: {
  member: MemberPayload;
  body: IRedditCommunityPost.IRequest;
}): Promise<IPageIRedditCommunityPost.ISummary> {
  // Validate sort method
  const validSortMethods: Array<"hot" | "new" | "top" | "controversial"> = [
    "hot",
    "new",
    "top",
    "controversial",
  ];
  const sortMethod: "hot" | "new" | "top" | "controversial" =
    props.body.sort ?? "hot";
  if (!validSortMethods.includes(sortMethod)) {
    throw new HttpException("Invalid sort method", 400);
  }
  // Validate time period for top sort
  if (sortMethod === "top" && !props.body.timePeriod) {
    // timePeriod is optional, default behavior is all_time
  }
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const validatedLimit = Math.min(Math.max(limit, 1), 100);
  const skip = (page - 1) * validatedLimit;
  // Build time filter for top sort - work with string dates only
  const timeFrom: string | null = (() => {
    if (sortMethod !== "top" || !props.body.timePeriod) {
      return null;
    }
    const period = props.body.timePeriod;
    const nowStr: string = new Date().toISOString();
    switch (period) {
      case "today":
        return nowStr;
      case "this_week":
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return weekAgo.toISOString();
      case "this_month":
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return monthAgo.toISOString();
      case "this_year":
        const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        return yearAgo.toISOString();
      case "all_time":
        return null;
      default:
        return null;
    }
  })();
  // Query subscribed community IDs
  const subscriptions =
    await MyGlobal.prisma.reddit_community_subscriptions.findMany({
      where: {
        reddit_community_member_id: props.member.id,
        status: "active",
      },
      select: { reddit_community_communities_id: true },
    });
  const subscribedCommunityIds = subscriptions.map(
    (s) => s.reddit_community_communities_id,
  );
  if (subscribedCommunityIds.length === 0) {
    // No subscriptions, return empty page
    return {
      pagination: {
        current: page,
        limit: validatedLimit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
      data: [],
    } satisfies IPageIRedditCommunityPost.ISummary;
  }
  // Build where conditions - filter by subscribed communities only
  const baseWhere: Prisma.reddit_community_postsWhereInput = {
    deleted_at: null,
    reddit_community_community_id: { in: subscribedCommunityIds },
  };
  // Apply additional filters
  const additionalWhere: Prisma.reddit_community_postsWhereInput = {
    ...(props.body.postType && { post_type: props.body.postType }),
    ...(props.body.voteScoreMin !== undefined && {
      vote_score: { gte: props.body.voteScoreMin },
    }),
    ...(props.body.voteScoreMax !== undefined && {
      vote_score: { lte: props.body.voteScoreMax },
    }),
    ...(props.body.dateFrom && {
      created_at: { gte: props.body.dateFrom },
    }),
    ...(props.body.dateTo && {
      created_at: { lte: props.body.dateTo },
    }),
    ...(props.body.communityId && {
      reddit_community_community_id: props.body.communityId,
    }),
    ...(props.body.authorId && {
      reddit_community_member_id: props.body.authorId,
    }),
    // Time filter for top sort
    ...(timeFrom && { created_at: { gte: timeFrom } }),
  };
  const where: Prisma.reddit_community_postsWhereInput = {
    AND: [baseWhere, additionalWhere],
  };
  // Build orderBy
  const orderByInput: Prisma.reddit_community_postsOrderByWithRelationInput =
    (() => {
      if (sortMethod === "new") {
        return { created_at: "desc" };
      }
      if (sortMethod === "top") {
        return { vote_score: "desc" };
      }
      if (sortMethod === "controversial") {
        return { comment_count: "desc", vote_score: "desc" };
      }
      // hot: default by created_at (exponential decay approximation)
      return { created_at: "desc" };
    })();
  // Get posts with pagination
  const posts = await MyGlobal.prisma.reddit_community_posts.findMany({
    where,
    skip,
    take: validatedLimit,
    orderBy: orderByInput,
    ...RedditCommunityPostAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.reddit_community_posts.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit: validatedLimit,
      records: total,
      pages: Math.ceil(total / validatedLimit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      posts,
      RedditCommunityPostAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditCommunityPost.ISummary;
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
// export async function patchRedditCommunityMemberHomeFeed(props: {
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