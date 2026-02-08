import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformUserCommentsCommentIdVotesVoteId(props: {
  user: UserPayload;
  commentId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify vote existence and its relation to the comment
  const vote =
    await MyGlobal.prisma.community_platform_comment_votes.findUnique({
      where: { id: props.voteId },
    });
  if (vote === null) {
    throw new HttpException("Vote not found", 404);
  }
  if (vote.community_platform_comment_id !== props.commentId) {
    throw new HttpException("Vote does not belong to the comment", 404);
  }
  // Fetch related comment to get the post_id and user_id (comment owner)
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: props.commentId },
    select: {
      post_id: true,
      user_id: true,
    },
  });
  if (comment === null) {
    throw new HttpException("Comment not found", 404);
  }
  // Fetch the post to get community_id
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: comment.post_id },
    select: { community_id: true },
  });
  if (post === null) {
    throw new HttpException("Post not found", 404);
  }
  // Authorization check
  const isVoteOwner = vote.community_platform_user_id === props.user.id;
  // Check if user is community moderator
  const moderator =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        user_id: props.user.id,
        community_id: post.community_id,
      },
    });
  // Check if user is admin
  const admin = await MyGlobal.prisma.community_platform_admins.findUnique({
    where: { id: props.user.id },
  });
  if (!isVoteOwner && moderator === null && admin === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Proceed with deletion and vote score update in transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.community_platform_comment_votes.delete({
      where: { id: props.voteId },
    });
    // Recalculate vote score
    const votes = await tx.community_platform_comment_votes.findMany({
      where: { community_platform_comment_id: props.commentId },
      select: { vote_type: true },
    });
    let voteScore = 0;
    for (const v of votes) {
      if (v.vote_type === "upvote") {
        voteScore += 1;
      } else if (v.vote_type === "downvote") {
        voteScore -= 1;
      }
    }
    // According to instructions, vote_score update might be missing in schema, so commented out
    // await tx.community_platform_comments.update({
    //   where: { id: props.commentId },
    //   data: { vote_score: voteScore },
    // });
  });
}
