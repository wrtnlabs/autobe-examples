import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityPostVote";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IRedditLikeCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeCommunityPostVoteAtSummaryTransformer } from "../transformers/RedditLikeCommunityPostVoteAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeCommunityMemberPostsPostIdVotes(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<IPageIRedditLikeCommunityPostVote.ISummary> {
  await MyGlobal.prisma.reddit_like_community_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true },
  });
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const where = {
    reddit_like_community_post_id: props.postId,
  } satisfies Prisma.reddit_like_community_post_votesWhereInput;
  const records =
    await MyGlobal.prisma.reddit_like_community_post_votes.findMany({
      where,
      ...RedditLikeCommunityPostVoteAtSummaryTransformer.select(),
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
    });
  const total = await MyGlobal.prisma.reddit_like_community_post_votes.count({
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
      records,
      RedditLikeCommunityPostVoteAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditLikeCommunityPostVote.ISummary;
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
// import { IPageIRedditLikeCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityPostVote";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditLikeCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostVote";
// import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditLikeCommunityMemberPostsPostIdVotes(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
// }): Promise<IPageIRedditLikeCommunityPostVote.ISummary> {
//   const records = await MyGlobal.prisma.reddit_like_community_post_votes.findMany({
//     ...RedditLikeCommunityPostVoteAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditLikeCommunityPostVoteAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------