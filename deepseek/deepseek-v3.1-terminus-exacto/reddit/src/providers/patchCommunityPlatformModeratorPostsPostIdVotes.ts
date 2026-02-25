import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { ICommunityPlatformPostVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteScore";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformPostVoteScoreTransformer } from "../transformers/CommunityPlatformPostVoteScoreTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformModeratorPostsPostIdVotes(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostVote.IUpdate;
}): Promise<ICommunityPlatformPostVoteScore> {
  // Verify post exists and moderator is not the author
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: { id: true, user_id: true },
    },
  );
  if (post.user_id === props.moderator.id) {
    throw new HttpException("Cannot vote on your own post", 400);
  }
  const now = toISOStringSafe(new Date());
  const timestamp = toISOStringSafe(new Date());
  // Use transaction for atomic operations
  return await MyGlobal.prisma.$transaction(async (tx) => {
    // Check for existing vote
    const existingVote = await tx.community_platform_post_votes.findFirst({
      where: {
        post_id: props.postId,
        user_id: props.moderator.id,
      },
    });
    let operationType: "create" | "update" = "create";
    let voteId: string;
    let previousVoteType: string | null = null;
    if (existingVote) {
      // Update existing vote
      previousVoteType = existingVote.vote_type;
      await tx.community_platform_post_votes.update({
        where: { id: existingVote.id },
        data: { vote_type: props.body.vote_type, updated_at: now },
      });
      voteId = existingVote.id;
      operationType = "update";
    } else {
      // Create new vote
      const newVote = await tx.community_platform_post_votes.create({
        data: {
          id: v4(),
          vote_type: props.body.vote_type,
          post_id: props.postId,
          user_id: props.moderator.id,
          created_at: now,
          updated_at: now,
        },
      });
      voteId = newVote.id;
    }
    // Calculate karma impact (+1 for upvote, -1 for downvote)
    const karmaImpact = props.body.vote_type === "upvote" ? 1 : -1;
    // Record voting transaction
    await tx.community_platform_voting_transactions.create({
      data: {
        id: v4(),
        operation_type: operationType,
        user_id: props.moderator.id,
        vote_type: props.body.vote_type,
        previous_vote_type: previousVoteType,
        karma_impact: karmaImpact,
        transaction_timestamp: timestamp,
        ip_address: null,
        user_agent: null,
        updated_at: now,
        created_at: now,
      },
    });
    // Calculate vote score changes
    let upvoteDelta = 0;
    let downvoteDelta = 0;
    if (existingVote) {
      // Remove previous vote impact
      if (existingVote.vote_type === "upvote") upvoteDelta -= 1;
      if (existingVote.vote_type === "downvote") downvoteDelta -= 1;
    }
    // Add new vote impact
    if (props.body.vote_type === "upvote") upvoteDelta += 1;
    if (props.body.vote_type === "downvote") downvoteDelta += 1;
    // Update vote score aggregates with transformer select
    const voteScores = await tx.community_platform_post_vote_scores.findUnique({
      where: { community_platform_post_id: props.postId },
      ...CommunityPlatformPostVoteScoreTransformer.select(),
    });
    if (voteScores) {
      // Update existing vote scores
      await tx.community_platform_post_vote_scores.update({
        where: { id: voteScores.id },
        data: {
          upvote_count: { increment: upvoteDelta },
          downvote_count: { increment: downvoteDelta },
          total_score: { increment: upvoteDelta - downvoteDelta },
          last_updated_at: now,
          updated_at: now,
        },
      });
      // Fetch updated scores with transformer select
      const updatedVoteScores =
        await tx.community_platform_post_vote_scores.findUniqueOrThrow({
          where: { id: voteScores.id },
          ...CommunityPlatformPostVoteScoreTransformer.select(),
        });
      return await CommunityPlatformPostVoteScoreTransformer.transform(
        updatedVoteScores,
      );
    } else {
      // Create new vote scores
      const newVoteScores = await tx.community_platform_post_vote_scores.create(
        {
          data: {
            id: v4(),
            community_platform_post_id: props.postId,
            upvote_count: Math.max(upvoteDelta, 0), // Ensure non-negative
            downvote_count: Math.max(downvoteDelta, 0),
            total_score: upvoteDelta - downvoteDelta,
            last_updated_at: now,
            created_at: now,
            updated_at: now,
          },
          ...CommunityPlatformPostVoteScoreTransformer.select(),
        },
      );
      return await CommunityPlatformPostVoteScoreTransformer.transform(
        newVoteScores,
      );
    }
  });
}
