import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformCommentTransformer } from "../transformers/CommunityPlatformCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformModeratorCommentsCommentIdVotes(props: {
  moderator: ModeratorPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentVote.IUpdate;
}): Promise<ICommunityPlatformComment> {
  // Validate vote type
  if (!["upvote", "downvote", "none"].includes(props.body.vote_type)) {
    throw new HttpException("Invalid vote type", 400);
  }
  const now = toISOStringSafe(new Date());
  // Verify comment exists
  const comment =
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: { id: true, community_platform_user_id: true },
    });
  // Check for existing vote
  const existingVote =
    await MyGlobal.prisma.community_platform_comment_votes.findUnique({
      where: {
        user_id_comment_id: {
          user_id: props.moderator.id,
          comment_id: props.commentId,
        },
      },
    });
  await MyGlobal.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    if (props.body.vote_type === "none") {
      // Remove vote if exists
      if (existingVote) {
        await tx.community_platform_comment_votes.delete({
          where: { id: existingVote.id },
        });
        // Record voting transaction
        await tx.community_platform_voting_transactions.create({
          data: {
            id: v4(),
            user_id: props.moderator.id,
            operation_type: "delete",
            vote_type: existingVote.vote_type,
            previous_vote_type: existingVote.vote_type,
            karma_impact: existingVote.vote_type === "upvote" ? -1 : 1,
            transaction_timestamp: now,
            created_at: now,
            updated_at: now,
          },
        });
        // Update karma impact
        const karmaDelta = existingVote.vote_type === "upvote" ? -1 : 1;
        // karmaDelta is always non-zero (1 or -1), so remove redundant check
        await tx.community_platform_vote_karma_impacts.create({
          data: {
            id: v4(),
            user_id: comment.community_platform_user_id,
            karma_delta: karmaDelta,
            created_at: now,
            updated_at: now,
          },
        });
        await tx.community_platform_users.update({
          where: { id: comment.community_platform_user_id },
          data: { karma: { increment: karmaDelta } },
        });
      }
    } else {
      // Update or create vote
      const previousVoteType = existingVote?.vote_type;
      if (existingVote) {
        await tx.community_platform_comment_votes.update({
          where: { id: existingVote.id },
          data: {
            vote_type: props.body.vote_type,
            updated_at: now,
          },
        });
      } else {
        await tx.community_platform_comment_votes.create({
          data: {
            id: v4(),
            user_id: props.moderator.id,
            comment_id: props.commentId,
            vote_type: props.body.vote_type,
            created_at: now,
            updated_at: now,
          },
        });
      }
      // Calculate karma delta
      const karmaDelta = calculateKarmaDelta(
        previousVoteType,
        props.body.vote_type,
      );
      // Record voting transaction
      await tx.community_platform_voting_transactions.create({
        data: {
          id: v4(),
          user_id: props.moderator.id,
          operation_type: existingVote ? "update" : "create",
          vote_type: props.body.vote_type,
          previous_vote_type: previousVoteType || null,
          karma_impact: karmaDelta,
          transaction_timestamp: now,
          created_at: now,
          updated_at: now,
        },
      });
      // Update karma impact
      if (karmaDelta !== 0) {
        await tx.community_platform_vote_karma_impacts.create({
          data: {
            id: v4(),
            user_id: comment.community_platform_user_id,
            karma_delta: karmaDelta,
            created_at: now,
            updated_at: now,
          },
        });
        await tx.community_platform_users.update({
          where: { id: comment.community_platform_user_id },
          data: { karma: { increment: karmaDelta } },
        });
      }
    }
    // Update aggregated scores using efficient count queries
    const upvotes = await tx.community_platform_comment_votes.count({
      where: {
        comment_id: props.commentId,
        vote_type: "upvote",
      },
    });
    const downvotes = await tx.community_platform_comment_votes.count({
      where: {
        comment_id: props.commentId,
        vote_type: "downvote",
      },
    });
    const score = upvotes - downvotes;
    await tx.community_platform_comment_vote_scores.upsert({
      where: { community_platform_comment_id: props.commentId },
      update: {
        upvote_count: upvotes,
        downvote_count: downvotes,
        score: score,
        last_updated_at: now,
      },
      create: {
        id: v4(),
        community_platform_comment_id: props.commentId,
        upvote_count: upvotes,
        downvote_count: downvotes,
        score: score,
        last_updated_at: now,
        created_at: now,
      },
    });
  });
  // Return updated comment
  const updatedComment =
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      ...CommunityPlatformCommentTransformer.select(),
    });
  return await CommunityPlatformCommentTransformer.transform(updatedComment);
}
function calculateKarmaDelta(
  previousVoteType: string | undefined,
  newVoteType: string,
): number {
  if (!previousVoteType) {
    // New vote
    return newVoteType === "upvote" ? 1 : -1;
  }
  if (previousVoteType === "upvote" && newVoteType === "downvote") {
    // Changed from upvote to downvote: remove +1, add -1 = net -2
    return -2;
  }
  if (previousVoteType === "downvote" && newVoteType === "upvote") {
    // Changed from downvote to upvote: remove -1, add +1 = net +2
    return 2;
  }
  // Same vote type or no change
  return 0;
}
