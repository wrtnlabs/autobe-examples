import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { IRedditLikeCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommentVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeCommunityCommentVoteCollector } from "../collectors/RedditLikeCommunityCommentVoteCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeCommunityCommentVoteTransformer } from "../transformers/RedditLikeCommunityCommentVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeCommunityMemberCommentVotes(props: {
  member: MemberPayload;
  body: IRedditLikeCommunityCommentVote.ICreate;
}): Promise<IRedditLikeCommunityCommentVote> {
  const commentId = props.body.comment_id;
  if (commentId === undefined || commentId === null) {
    throw new HttpException("Comment ID is required", 400);
  }
  const comment =
    await MyGlobal.prisma.reddit_like_community_comments.findUniqueOrThrow({
      where: { id: commentId },
      select: {
        id: true,
        member_id: true,
        deleted_at: true,
      },
    });
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment has been deleted", 404);
  }
  const existingVote =
    await MyGlobal.prisma.reddit_like_community_comment_votes.findFirst({
      where: {
        reddit_like_community_member_id: props.member.id,
        reddit_like_community_comment_id: commentId,
      },
    });
  const oldDirection = existingVote?.direction;
  const newDirection = props.body.direction;
  const commentAuthorId = comment.member_id;
  const isSelfVoting = commentAuthorId === props.member.id;
  let karmaDelta = 0;
  if (!isSelfVoting) {
    if (oldDirection === undefined) {
      karmaDelta = newDirection === "upvote" ? 1 : -1;
    } else if (oldDirection !== newDirection) {
      karmaDelta = newDirection === "upvote" ? 2 : -2;
    }
  }
  const createData = await RedditLikeCommunityCommentVoteCollector.collect({
    body: props.body,
    redditLikeCommunityComments: comment,
    redditLikeCommunityMembers: props.member,
  });
  const mutation =
    await MyGlobal.prisma.reddit_like_community_comment_votes.upsert({
      where: {
        reddit_like_community_member_id_reddit_like_community_comment_id: {
          reddit_like_community_member_id: props.member.id,
          reddit_like_community_comment_id: commentId,
        },
      },
      create: createData,
      update: {
        direction: newDirection,
      },
    });
  if (karmaDelta !== 0) {
    await MyGlobal.prisma.reddit_like_community_profiles.update({
      where: { reddit_like_community_member_id: commentAuthorId },
      data: { karma: { increment: karmaDelta } },
    });
  }
  const record =
    await MyGlobal.prisma.reddit_like_community_comment_votes.findUniqueOrThrow(
      {
        where: { id: mutation.id },
        ...RedditLikeCommunityCommentVoteTransformer.select(),
      },
    );
  return await RedditLikeCommunityCommentVoteTransformer.transform(record);
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
// import { IRedditLikeCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommentVote";
// import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
// import { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditLikeCommunityMemberCommentVotes(props: {
//   member: MemberPayload;
//   body: IRedditLikeCommunityCommentVote.ICreate;
// }): Promise<IRedditLikeCommunityCommentVote> {
//   const record = await MyGlobal.prisma.reddit_like_community_comment_votes.create({
//     data: await RedditLikeCommunityCommentVoteCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...RedditLikeCommunityCommentVoteTransformer.select(),
//   });
//   return await RedditLikeCommunityCommentVoteTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------