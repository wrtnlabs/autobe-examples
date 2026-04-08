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

export async function patchRedditCommunityMemberFeedsCommunityCommunityId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCommunityPost.IRequest;
}): Promise<IPageIRedditCommunityPost.ISummary> {
  // Validate community exists and is not soft-deleted
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: {
        id: props.communityId,
        deleted_at: null,
      },
    });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  // Validate sort parameter
  const validSortTypes: Array<"hot" | "new" | "top" | "controversial"> = [
    "hot",
    "new",
    "top",
    "controversial",
  ];
  if (
    props.body.sort !== undefined &&
    !validSortTypes.includes(props.body.sort)
  ) {
    throw new HttpException("Invalid sort type", 400);
  }
  // Extract pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build base WHERE clause
  const baseWhereInput: Prisma.reddit_community_postsWhereInput = {
    reddit_community_community_id: props.communityId,
    deleted_at: null,
    ...(props.body.postType !== undefined && {
      post_type: props.body.postType,
    }),
    ...(props.body.voteScoreMin !== undefined && {
      vote_score: { gte: props.body.voteScoreMin },
    }),
    ...(props.body.voteScoreMax !== undefined && {
      vote_score: { lte: props.body.voteScoreMax },
    }),
    ...(props.body.dateFrom !== undefined && {
      created_at: { gte: new Date(props.body.dateFrom) },
    }),
    ...(props.body.dateTo !== undefined && {
      created_at: { lte: new Date(props.body.dateTo) },
    }),
    ...(props.body.authorId !== undefined && {
      reddit_community_member_id: props.body.authorId,
    }),
  };
  // Build final WHERE clause
  let whereInput: Prisma.reddit_community_postsWhereInput = baseWhereInput;
  // Apply time period filter for "top" sort
  if (props.body.sort === "top" && props.body.timePeriod !== undefined) {
    const now = new Date();
    switch (props.body.timePeriod) {
      case "today":
        whereInput = {
          ...baseWhereInput,
          created_at: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        };
        break;
      case "this_week":
        whereInput = {
          ...baseWhereInput,
          created_at: {
            gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          },
        };
        break;
      case "this_month":
        whereInput = {
          ...baseWhereInput,
          created_at: {
            gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          },
        };
        break;
      case "this_year":
        whereInput = {
          ...baseWhereInput,
          created_at: {
            gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
          },
        };
        break;
      case "all_time":
      default:
        whereInput = baseWhereInput;
        break;
    }
  }
  // Build ORDER BY clause
  const hotOrderBy: Prisma.reddit_community_postsOrderByWithRelationInput[] = [
    { vote_score: "desc" },
    { created_at: "desc" },
  ];
  const newOrderBy: Prisma.reddit_community_postsOrderByWithRelationInput[] = [
    { created_at: "desc" },
  ];
  const topOrderBy: Prisma.reddit_community_postsOrderByWithRelationInput[] = [
    { vote_score: "desc" },
  ];
  const controversialOrderBy: Prisma.reddit_community_postsOrderByWithRelationInput[] =
    [{ vote_score: "asc" }];
  const orderByInput: Prisma.reddit_community_postsOrderByWithRelationInput[] =
    props.body.sort === "hot"
      ? hotOrderBy
      : props.body.sort === "new"
        ? newOrderBy
        : props.body.sort === "top"
          ? topOrderBy
          : props.body.sort === "controversial"
            ? controversialOrderBy
            : newOrderBy;
  // Query posts
  const records = await MyGlobal.prisma.reddit_community_posts.findMany({
    ...RedditCommunityPostAtSummaryTransformer.select(),
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
  });
  // Get total count
  const total = await MyGlobal.prisma.reddit_community_posts.count({
    where: whereInput,
  });
  // Build response
  const paginationData: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  return {
    pagination: paginationData,
    data: await ArrayUtil.asyncMap(
      records,
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
// export async function patchRedditCommunityMemberFeedsCommunityCommunityId(props: {
//   member: MemberPayload;
//   communityId: string & tags.Format<"uuid">;
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