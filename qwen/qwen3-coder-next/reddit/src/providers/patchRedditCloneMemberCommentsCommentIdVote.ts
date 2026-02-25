import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommentVote";
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

export async function patchRedditCloneMemberCommentsCommentIdVote(props: {
  member: MemberPayload;
  commentId: string;
  body: IRedditCloneCommentVote.ICreate;
}): Promise<IRedditCloneCommentVote.IResponse> {
  // Validate commentId format
  if (!typia.is<string & tags.Format<"uuid">>(props.commentId)) {
    throw new HttpException("Invalid comment ID format", 400);
  }
  // Step 1: Retrieve comment with author relation
  const comment =
    await MyGlobal.prisma.reddit_clone_content_comments.findUnique({
      where: { id: props.commentId },
      select: {
        id: true,
        vote_score: true,
        member_id: true,
        post_id: true,
        deleted_at: true,
      },
    });
  if (comment === null) {
    throw new HttpException("Comment not found", 404);
  }
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment has been deleted", 410);
  }
  // Step 2: Fetch post to get community ID
  const post = await MyGlobal.prisma.reddit_clone_content_posts.findUnique({
    where: { id: comment.post_id },
    select: {
      community_id: true,
    },
  });
  // Step 3: Check if user is banned from the community
  if (post?.community_id) {
    const ban = await MyGlobal.prisma.reddit_clone_community_bans.findFirst({
      where: {
        community_id: post.community_id,
        user_id: props.member.id,
        deleted_at: null,
      },
    });
    if (ban !== null) {
      throw new HttpException("You are banned from this community", 403);
    }
  }
  // Step 4: Check for self-vote (users cannot vote on their own comments)
  if (comment.member_id === props.member.id) {
    throw new HttpException("Cannot vote on your own comment", 403);
  }
  // Step 5: Check for existing vote
  const existingVote =
    await MyGlobal.prisma.reddit_clone_comment_votes.findUnique({
      where: {
        member_id_comment_id: {
          member_id: props.member.id,
          comment_id: props.commentId,
        },
      },
    });
  // Step 6: Determine vote change and new vote value
  const voteType = props.body.voteType;
  let newVoteValue: 1 | -1 | 0;
  let voteChange: number;
  if (voteType === "upvote") {
    newVoteValue = 1;
    voteChange = existingVote ? 1 - existingVote.vote : 1;
  } else if (voteType === "downvote") {
    newVoteValue = -1;
    voteChange = existingVote ? -1 - existingVote.vote : -1;
  } else {
    // neutral
    newVoteValue = 0;
    voteChange = existingVote ? 0 - existingVote.vote : 0;
  }
  // Step 7: Update comment vote score (using transaction for atomicity)
  const updatedComment = await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.reddit_clone_content_comments.update({
      where: { id: props.commentId },
      data: {
        vote_score: { increment: voteChange },
        updated_at: toISOStringSafe(new Date()),
      },
    });
    // Step 8: Update karma log for comment author
    if (voteChange !== 0) {
      await tx.reddit_clone_content_karma_logs.upsert({
        where: { user_id: comment.member_id },
        create: {
          id: v4(),
          user_id: comment.member_id,
          score: voteChange,
        },
        update: {
          score: { increment: voteChange },
        },
      });
    }
    return await tx.reddit_clone_content_comments.findUnique({
      where: { id: props.commentId },
      select: { vote_score: true },
    });
  });
  // Step 9: Create or update vote record
  if (existingVote) {
    await MyGlobal.prisma.reddit_clone_comment_votes.update({
      where: { id: existingVote.id },
      data: {
        vote: newVoteValue,
        updated_at: toISOStringSafe(new Date()),
      },
    });
  } else {
    await MyGlobal.prisma.reddit_clone_comment_votes.create({
      data: {
        id: v4(),
        member_id: props.member.id,
        comment_id: props.commentId,
        vote: newVoteValue,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });
  }
  // Step 10: Return response
  return {
    voteScore: updatedComment!.vote_score,
    userVote:
      newVoteValue === 1 ? "upvote" : newVoteValue === -1 ? "downvote" : "none",
  };
}
