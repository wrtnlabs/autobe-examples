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
import { CommunityPlatformCommentVoteCollector } from "../collectors/CommunityPlatformCommentVoteCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformCommentTransformer } from "../transformers/CommunityPlatformCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformUserCommentsCommentIdVotes(props: {
  user: UserPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentVote.IRequest;
}): Promise<ICommunityPlatformComment> {
  // Verify comment exists and is accessible
  const comment =
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId, deleted_at: null },
      select: { id: true, community_platform_user_id: true },
    });
  // Check existing vote
  const existingVote =
    await MyGlobal.prisma.community_platform_comment_votes.findUnique({
      where: {
        user_id_comment_id: {
          user_id: props.user.id,
          comment_id: props.commentId,
        },
      },
    });
  const now = toISOStringSafe(new Date());
  // Handle vote removal
  if (props.body.vote_type === "none") {
    if (existingVote) {
      await MyGlobal.prisma.$transaction(async (tx) => {
        // Delete vote
        await tx.community_platform_comment_votes.delete({
          where: { id: existingVote.id },
        });
        // Update vote scores
        await updateVoteScores(tx, props.commentId, now);
        // Create voting transaction for removal
        await createVotingTransaction(
          tx,
          props.user.id,
          "delete",
          existingVote.vote_type,
          null,
          -getKarmaDelta(existingVote.vote_type),
          now,
        );
      });
    }
  } else if (props.body.vote_type !== null) {
    // Handle vote creation/update
    await MyGlobal.prisma.$transaction(async (tx) => {
      let previousVoteType: string | null = null;
      let karmaDelta = 0;
      if (existingVote) {
        previousVoteType = existingVote.vote_type;
        karmaDelta =
          getKarmaDelta(
            typia.assert<"upvote" | "downvote" | "none">(props.body.vote_type),
          ) - getKarmaDelta(existingVote.vote_type);
        // Update existing vote
        await tx.community_platform_comment_votes.update({
          where: { id: existingVote.id },
          data: {
            vote_type: typia.assert<"upvote" | "downvote" | "none">(
              props.body.vote_type,
            ),
            updated_at: new Date(now),
          },
        });
      } else {
        // Create new vote
        karmaDelta = getKarmaDelta(
          typia.assert<"upvote" | "downvote" | "none">(props.body.vote_type),
        );
        await tx.community_platform_comment_votes.create({
          data: await CommunityPlatformCommentVoteCollector.collect({
            body: {
              vote_type: typia.assert<"upvote" | "downvote" | "none">(
                props.body.vote_type,
              ),
            },
            user: { id: props.user.id },
            comment: { id: props.commentId },
            session: { id: props.user.session_id },
          }),
        });
      }
      // Update vote scores
      await updateVoteScores(tx, props.commentId, now);
      // Create voting transaction
      await createVotingTransaction(
        tx,
        props.user.id,
        existingVote ? "update" : "create",
        typia.assert<"upvote" | "downvote" | "none">(props.body.vote_type),
        previousVoteType,
        karmaDelta,
        now,
      );
      // Update karma if needed
      if (karmaDelta !== 0) {
        await tx.community_platform_users.update({
          where: { id: comment.community_platform_user_id },
          data: { karma: { increment: karmaDelta } },
        });
        // Record karma impact
        await tx.community_platform_vote_karma_impacts.create({
          data: {
            id: v4(),
            user_id: comment.community_platform_user_id,
            karma_delta: karmaDelta,
            created_at: new Date(now),
            updated_at: new Date(now),
          },
        });
      }
    });
  }
  // Return updated comment
  const updatedComment =
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      ...CommunityPlatformCommentTransformer.select(),
    });
  return await CommunityPlatformCommentTransformer.transform(updatedComment);
}
// Helper functions
function getKarmaDelta(voteType: string): number {
  return voteType === "upvote" ? 1 : voteType === "downvote" ? -1 : 0;
}
async function updateVoteScores(
  tx: Prisma.TransactionClient,
  commentId: string,
  now: string,
) {
  const [upvoteCount, downvoteCount] = await Promise.all([
    tx.community_platform_comment_votes.count({
      where: { comment_id: commentId, vote_type: "upvote" },
    }),
    tx.community_platform_comment_votes.count({
      where: { comment_id: commentId, vote_type: "downvote" },
    }),
  ]);
  const score = upvoteCount - downvoteCount;
  await tx.community_platform_comment_vote_scores.upsert({
    where: { community_platform_comment_id: commentId },
    update: {
      upvote_count: upvoteCount,
      downvote_count: downvoteCount,
      score: score,
      last_updated_at: new Date(now),
    },
    create: {
      id: v4(),
      community_platform_comment_id: commentId,
      upvote_count: upvoteCount,
      downvote_count: downvoteCount,
      score: score,
      last_updated_at: new Date(now),
      created_at: new Date(now),
    },
  });
}
async function createVotingTransaction(
  tx: Prisma.TransactionClient,
  userId: string,
  operationType: string,
  voteType: string | null,
  previousVoteType: string | null,
  karmaImpact: number,
  now: string,
) {
  await tx.community_platform_voting_transactions.create({
    data: {
      id: v4(),
      user_id: userId,
      operation_type: operationType,
      vote_type: voteType || "none",
      previous_vote_type: previousVoteType,
      karma_impact: karmaImpact,
      transaction_timestamp: new Date(now),
      created_at: new Date(now),
      updated_at: new Date(now),
    },
  });
}
