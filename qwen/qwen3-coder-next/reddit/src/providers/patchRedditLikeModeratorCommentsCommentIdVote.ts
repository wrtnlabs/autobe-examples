import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommentVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeModeratorCommentsCommentIdVote(props: {
  moderator: ModeratorPayload;
  commentId: string;
  body: IRedditLikeCommentVote.IUpdate;
}): Promise<IRedditLikeCommentVote.IUpdate> {
  // Retrieve target comment with post relation to get community_id
  const comment = await MyGlobal.prisma.reddit_like_comments.findUniqueOrThrow({
    where: { id: props.commentId },
    select: {
      id: true,
      author_id: true,
      post_id: true,
      deleted_at: true,
    },
  });
  // Get post to access community_id
  const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: comment.post_id },
    select: { id: true, community_id: true },
  });
  // Verify moderator has access to the community
  const moderatorRole =
    await MyGlobal.prisma.reddit_like_moderator_roles.findFirst({
      where: {
        user_id: props.moderator.id,
        community_id: post.community_id,
      },
    });
  if (moderatorRole === null) {
    throw new HttpException(
      "Forbidden - Not authorized for this community",
      403,
    );
  }
  // Check if comment is deleted
  if (comment.deleted_at !== null) {
    throw new HttpException("Cannot vote on deleted comment", 400);
  }
  // Check if moderator is trying to vote on own comment (moderator should not be author)
  if (comment.author_id === props.moderator.id) {
    throw new HttpException("Cannot vote on own comment", 403);
  }
  // Extract vote value (handle null/undefined as vote removal)
  const voteValue = props.body.value;
  // If vote value is null or undefined, remove existing vote
  if (voteValue === null || voteValue === undefined) {
    await MyGlobal.prisma.reddit_like_comment_votes.deleteMany({
      where: {
        reddit_like_comment_id: props.commentId,
        reddit_like_member_id: props.moderator.id,
      },
    });
    // Return success response with updated vote status
    return {
      value: null,
    };
  }
  // Validate vote value
  if (voteValue !== 1 && voteValue !== -1) {
    throw new HttpException(
      "Invalid vote value. Must be 1 (upvote) or -1 (downvote)",
      400,
    );
  }
  // Create or update vote
  const existingVote =
    await MyGlobal.prisma.reddit_like_comment_votes.findFirst({
      where: {
        reddit_like_comment_id: props.commentId,
        reddit_like_member_id: props.moderator.id,
      },
    });
  let updatedVote;
  if (existingVote) {
    // Update existing vote
    updatedVote = await MyGlobal.prisma.reddit_like_comment_votes.update({
      where: { id: existingVote.id },
      data: {
        value: voteValue,
      },
    });
  } else {
    // Create new vote
    updatedVote = await MyGlobal.prisma.reddit_like_comment_votes.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        reddit_like_comment_id: props.commentId,
        reddit_like_member_id: props.moderator.id,
        value: voteValue,
        created_at: new Date().toISOString(),
      },
    });
  }
  // Return vote confirmation
  return {
    value: updatedVote.value as 1 | -1 | null satisfies 1 | -1 | null as
      | 1
      | -1
      | null,
  };
}
