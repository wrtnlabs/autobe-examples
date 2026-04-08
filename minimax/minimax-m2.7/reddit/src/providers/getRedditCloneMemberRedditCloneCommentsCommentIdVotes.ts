import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePostVote";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneMemberRedditCloneCommentsCommentIdVotes(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<IPageIRedditClonePostVote.ISummary> {
  // Verify comment exists and get its associated post_id
  const comment = await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow(
    {
      where: { id: props.commentId },
      select: { id: true, reddit_clone_post_id: true },
    },
  );
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  // Query votes for the post that contains this comment
  const votes = await MyGlobal.prisma.reddit_clone_post_votes.findMany({
    where: { reddit_clone_post_id: comment.reddit_clone_post_id },
    orderBy: { created_at: "desc" },
    skip,
    take: limit,
    select: {
      id: true,
      direction: true,
      created_at: true,
      updated_at: true,
      member: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.reddit_clone_post_votes.count({
    where: { reddit_clone_post_id: comment.reddit_clone_post_id },
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: votes.map((vote) => ({
      id: vote.id,
      direction: vote.direction,
      createdAt: vote.created_at.toISOString(),
      member: {
        id: vote.member.id,
        username: vote.member.username,
      },
      updatedAt:
        vote.updated_at === null ? null : vote.updated_at.toISOString(),
    })),
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
// import { IPageIRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePostVote";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditCloneMemberRedditCloneCommentsCommentIdVotes(props: {
//   member: MemberPayload;
//   commentId: string & tags.Format<"uuid">;
// }): Promise<IPageIRedditClonePostVote.ISummary> {
//   const records = await MyGlobal.prisma.reddit_clone_post_votes.findMany({
//     ...RedditClonePostVoteAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditClonePostVoteAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------