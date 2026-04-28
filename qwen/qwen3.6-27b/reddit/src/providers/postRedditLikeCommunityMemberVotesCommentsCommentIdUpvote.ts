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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeCommunityCommentVoteTransformer } from "../transformers/RedditLikeCommunityCommentVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeCommunityMemberVotesCommentsCommentIdUpvote(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeCommunityCommentVote> {
  const now = new Date().toISOString();
  // Check existing vote by composite unique key
  const existingVote =
    await MyGlobal.prisma.reddit_like_community_comment_votes.findFirst({
      where: {
        reddit_like_community_member_id: props.member.id,
        reddit_like_community_comment_id: props.commentId,
      },
      select: {
        id: true,
        direction: true,
      },
    });
  // Idempotent: already upvoted
  if (existingVote?.direction === "upvote") {
    const vote =
      await MyGlobal.prisma.reddit_like_community_comment_votes.findFirstOrThrow(
        {
          where: {
            reddit_like_community_member_id: props.member.id,
            reddit_like_community_comment_id: props.commentId,
          },
          ...RedditLikeCommunityCommentVoteTransformer.select(),
        },
      );
    return await RedditLikeCommunityCommentVoteTransformer.transform(vote);
  }
  // Mutation in transaction: update/create vote + adjust karma
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Get comment to find author for karma update
    const comment = await tx.reddit_like_community_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: { member_id: true },
    });
    const authorMemberId = comment.member_id;
    if (existingVote?.direction === "downvote") {
      // Downvote -> Upvote: score delta +2, karma +2
      await tx.reddit_like_community_comment_votes.update({
        where: { id: existingVote.id },
        data: {
          direction: "upvote",
          updated_at: now,
        },
      });
      await tx.reddit_like_community_profiles.update({
        where: { reddit_like_community_member_id: authorMemberId },
        data: { karma: { increment: 2 } },
      });
    } else {
      // No vote -> First upvote: score delta +1, karma +1
      await tx.reddit_like_community_comment_votes.create({
        data: {
          id: v4(),
          reddit_like_community_member_id: props.member.id,
          reddit_like_community_comment_id: props.commentId,
          direction: "upvote",
          created_at: now,
          updated_at: now,
        },
      });
      await tx.reddit_like_community_profiles.update({
        where: { reddit_like_community_member_id: authorMemberId },
        data: { karma: { increment: 1 } },
      });
    }
  });
  // Fetch and return the vote with full transformer
  const vote =
    await MyGlobal.prisma.reddit_like_community_comment_votes.findFirstOrThrow({
      where: {
        reddit_like_community_member_id: props.member.id,
        reddit_like_community_comment_id: props.commentId,
      },
      ...RedditLikeCommunityCommentVoteTransformer.select(),
    });
  return await RedditLikeCommunityCommentVoteTransformer.transform(vote);
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
// export async function postRedditLikeCommunityMemberVotesCommentsCommentIdUpvote(props: {
//   member: MemberPayload;
//   commentId: string & tags.Format<"uuid">;
// }): Promise<IRedditLikeCommunityCommentVote> {
//   const record = await MyGlobal.prisma.reddit_like_community_comment_votes.findFirstOrThrow({
//     ...RedditLikeCommunityCommentVoteTransformer.select(),
//     where: { ... },
//   });
//   return await RedditLikeCommunityCommentVoteTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------