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
  // Verify the vote exists and belongs to the authenticated user
  const vote =
    await MyGlobal.prisma.community_platform_comment_votes.findUnique({
      where: {
        id: props.voteId,
        user_id: props.user.id,
      },
      select: {
        id: true,
        comment_id: true,
      },
    });
  if (!vote) {
    throw new HttpException(
      "Vote not found or you don't have permission to delete it",
      404,
    );
  }
  // Verify the vote belongs to the specified comment
  if (vote.comment_id !== props.commentId) {
    throw new HttpException(
      "Vote does not belong to the specified comment",
      400,
    );
  }
  // Use transaction to ensure atomicity
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Delete the vote record (cascade will handle karma impacts)
    await tx.community_platform_comment_votes.delete({
      where: { id: props.voteId },
    });
    // Get current vote counts using proper aggregation
    const aggregation = await tx.community_platform_comment_votes.aggregate({
      where: { comment_id: props.commentId },
      _count: {
        _all: true,
      },
    });
    // Get detailed vote counts by type
    const upvoteCount = await tx.community_platform_comment_votes.count({
      where: {
        comment_id: props.commentId,
        vote_type: "upvote",
      },
    });
    const downvoteCount = await tx.community_platform_comment_votes.count({
      where: {
        comment_id: props.commentId,
        vote_type: "downvote",
      },
    });
    const score = upvoteCount - downvoteCount;
    const now = toISOStringSafe(new Date());
    // Update or create the vote score record
    await tx.community_platform_comment_vote_scores.upsert({
      where: { community_platform_comment_id: props.commentId },
      update: {
        upvote_count: upvoteCount,
        downvote_count: downvoteCount,
        score: score,
        last_updated_at: now,
      },
      create: {
        id: v4() as string & tags.Format<"uuid">,
        community_platform_comment_id: props.commentId,
        upvote_count: upvoteCount,
        downvote_count: downvoteCount,
        score: score,
        last_updated_at: now,
        created_at: now,
      },
    });
  });
}
