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

export async function patchRedditCommunityGuestFeedsCommunityCommunityId(props: {
  guest: GuestPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCommunityPost.IRequest;
}): Promise<IPageIRedditCommunityPost.ISummary> {
  const pageInput = props.body.page;
  const limitInput = props.body.limit;
  const page =
    pageInput !== null && pageInput !== undefined && pageInput > 0
      ? pageInput
      : 1;
  const limit =
    limitInput !== null && limitInput !== undefined && limitInput > 0
      ? limitInput
      : 100;
  const skip = (page - 1) * limit;
  await MyGlobal.prisma.reddit_community_communities.findUniqueOrThrow({
    where: { id: props.communityId, deleted_at: null },
  });
  const nowTimestamp = Date.now();
  const whereClause: Prisma.reddit_community_postsWhereInput = {
    reddit_community_community_id: props.communityId,
    deleted_at: null,
    ...(props.body.dateFrom !== undefined
      ? { created_at: { gte: props.body.dateFrom } }
      : {}),
    ...(props.body.dateTo !== undefined
      ? { created_at: { lte: props.body.dateTo } }
      : {}),
    ...(props.body.voteScoreMin !== undefined
      ? { vote_score: { gte: props.body.voteScoreMin } }
      : {}),
    ...(props.body.voteScoreMax !== undefined
      ? { vote_score: { lte: props.body.voteScoreMax } }
      : {}),
    ...(props.body.postType !== undefined
      ? { post_type: props.body.postType }
      : {}),
    ...(props.body.authorId !== undefined
      ? { reddit_community_member_id: props.body.authorId }
      : {}),
  } satisfies Prisma.reddit_community_postsWhereInput;
  if (
    props.body.sort === "top" &&
    props.body.timePeriod !== undefined &&
    props.body.timePeriod !== "all_time"
  ) {
    const timePeriod = props.body.timePeriod;
    let timeThreshold: string & tags.Format<"date-time">;
    switch (timePeriod) {
      case "today":
        timeThreshold = new Date(
          nowTimestamp - 24 * 60 * 60 * 1000,
        ).toISOString();
        break;
      case "this_week":
        timeThreshold = new Date(
          nowTimestamp - 7 * 24 * 60 * 60 * 1000,
        ).toISOString();
        break;
      case "this_month":
        timeThreshold = new Date(
          nowTimestamp - 30 * 24 * 60 * 60 * 1000,
        ).toISOString();
        break;
      case "this_year":
        timeThreshold = new Date(
          nowTimestamp - 365 * 24 * 60 * 60 * 1000,
        ).toISOString();
        break;
      default:
        timeThreshold = "2000-01-01T00:00:00.000Z";
    }
    whereClause.created_at = { gte: timeThreshold };
  }
  const sortType: "hot" | "new" | "top" | "controversial" =
    props.body.sort ?? "hot";
  const orderByClause: Prisma.reddit_community_postsOrderByWithRelationInput =
    sortType === "new"
      ? { created_at: "desc" }
      : sortType === "controversial"
        ? { vote_score: "asc" }
        : { vote_score: "desc" };
  const records = await MyGlobal.prisma.reddit_community_posts.findMany({
    where: whereClause,
    orderBy: orderByClause,
    skip,
    take: limit,
    ...RedditCommunityPostAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_community_posts.count({
    where: whereClause,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total > 0 ? Math.ceil(total / limit) : 0,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
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
// export async function patchRedditCommunityGuestFeedsCommunityCommunityId(props: {
//   guest: GuestPayload;
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