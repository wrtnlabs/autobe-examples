import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommentVoteCollector } from "../collectors/CommunityPlatformCommentVoteCollector";
import { CommunityPlatformCommentTransformer } from "../transformers/CommunityPlatformCommentTransformer";

export async function postCommunityPlatformMemberPostsPostIdCommentsCommentIdVotes(props: {
  member: MemberPayload;
  postId: string;
  commentId: string;
  body: ICommunityPlatformCommentVote.ICreate;
}): Promise<ICommunityPlatformComment> {
  // Verify the comment exists and belongs to the specified post
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: props.commentId },
  });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  // Check if voter has already voted on this comment
  const existingVote =
    await MyGlobal.prisma.community_platform_comment_votes.findFirst({
      where: {
        comment: { id: props.commentId },
        voter: { id: props.member.id },
      },
    });
  // Prepare base data for vote operation
  const voteData = await CommunityPlatformCommentVoteCollector.collect({
    body: props.body,
    communityPlatformComments: { id: props.commentId },
    communityPlatformMembers: { id: props.member.id },
    communityPlatformMemberSessions: { id: props.member.session_id },
  });
  if (existingVote) {
    // User has voted before - determine if this is a change or cancellation
    if (existingVote.vote_type === props.body.upvote) {
      // Same vote as before - remove the vote
      await MyGlobal.prisma.community_platform_comment_votes.delete({
        where: { id: existingVote.id },
      });
      // Update comment score: subtract the value we're removing
      const updatedComment =
        await MyGlobal.prisma.community_platform_comments.update({
          where: { id: props.commentId },
          data: {
            vote_score: {
              decrement: props.body.upvote ? 1 : -1,
            },
            // Adjust karma of comment author
            author: {
              update: {
                karma: {
                  decrement: props.body.upvote ? 1 : -1,
                },
              },
            },
          },
          ...CommunityPlatformCommentTransformer.select(),
        });
      return await CommunityPlatformCommentTransformer.transform(
        updatedComment,
      );
    } else {
      // Different vote - convert existing vote
      await MyGlobal.prisma.community_platform_comment_votes.update({
        where: { id: existingVote.id },
        data: voteData,
      });
      // Update comment score: remove previous vote and add new one (net change of +2 or -2)
      // Previous vote: if it was upvote, we're removing +1, if downvote we're removing -1
      // New vote: if now upvote, adding +1, if downvote adding -1
      // So net change = (new vote - old vote)
      const oldVoteValue = existingVote.vote_type ? 1 : -1;
      const newVoteValue = props.body.upvote ? 1 : -1;
      const netChange = newVoteValue - oldVoteValue;
      const updatedComment =
        await MyGlobal.prisma.community_platform_comments.update({
          where: { id: props.commentId },
          data: {
            vote_score: {
              increment: netChange,
            },
            // Adjust karma of comment author: reverse previous adjustment and apply new one
            author: {
              update: {
                karma: {
                  increment: netChange,
                },
              },
            },
          },
          ...CommunityPlatformCommentTransformer.select(),
        });
      return await CommunityPlatformCommentTransformer.transform(
        updatedComment,
      );
    }
  } else {
    // First-time vote - create new vote record
    await MyGlobal.prisma.community_platform_comment_votes.create({
      data: voteData,
    });
    // Update comment score: add the value of this vote
    const updatedComment =
      await MyGlobal.prisma.community_platform_comments.update({
        where: { id: props.commentId },
        data: {
          vote_score: {
            increment: props.body.upvote ? 1 : -1,
          },
          // Adjust karma of comment author
          author: {
            update: {
              karma: {
                increment: props.body.upvote ? 1 : -1,
              },
            },
          },
        },
        ...CommunityPlatformCommentTransformer.select(),
      });
    return await CommunityPlatformCommentTransformer.transform(updatedComment);
  }
}
