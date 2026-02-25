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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformPostVoteScoreTransformer } from "../transformers/CommunityPlatformPostVoteScoreTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminPostsPostIdVotes(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostVote.IUpdate;
}): Promise<ICommunityPlatformPostVoteScore> {
  // Verify post exists and is not deleted
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId, deleted_at: null },
      select: { id: true, user_id: true },
    },
  );
  // Check if admin already has a vote on this post
  const existingVote =
    await MyGlobal.prisma.community_platform_post_votes.findUnique({
      where: {
        user_id_post_id: { user_id: props.admin.id, post_id: props.postId },
      },
    });
  let voteId: string & tags.Format<"uuid">;
  let operationType: string;
  let previousVoteType: string | null = null;
  let karmaImpact = 0;
  if (existingVote) {
    // Update existing vote - calculate karma impact based on change
    voteId = existingVote.id as string & tags.Format<"uuid">;
    operationType = "update";
    previousVoteType = existingVote.vote_type;
    // Calculate net karma change
    const oldImpact = existingVote.vote_type === "upvote" ? 1 : -1;
    const newImpact = props.body.vote_type === "upvote" ? 1 : -1;
    karmaImpact = newImpact - oldImpact;
    await MyGlobal.prisma.community_platform_post_votes.update({
      where: { id: voteId },
      data: {
        vote_type: props.body.vote_type,
        updated_at: new Date(),
      },
    });
  } else {
    // Create new vote
    voteId = v4() as string & tags.Format<"uuid">;
    operationType = "create";
    karmaImpact = props.body.vote_type === "upvote" ? 1 : -1;
    await MyGlobal.prisma.community_platform_post_votes.create({
      data: {
        id: voteId,
        user_id: props.admin.id,
        post_id: props.postId,
        vote_type: props.body.vote_type,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  }
  // Record voting transaction
  const transactionId = v4() as string & tags.Format<"uuid">;
  const now = new Date();
  await MyGlobal.prisma.community_platform_voting_transactions.create({
    data: {
      id: transactionId,
      user_id: props.admin.id,
      operation_type: operationType,
      vote_type: props.body.vote_type,
      previous_vote_type: previousVoteType,
      karma_impact: karmaImpact,
      transaction_timestamp: now,
      created_at: now,
      updated_at: now,
    },
  });
  // Recalculate vote scores
  const upvoteCount = await MyGlobal.prisma.community_platform_post_votes.count(
    {
      where: { post_id: props.postId, vote_type: "upvote" },
    },
  );
  const downvoteCount =
    await MyGlobal.prisma.community_platform_post_votes.count({
      where: { post_id: props.postId, vote_type: "downvote" },
    });
  const totalScore = upvoteCount - downvoteCount;
  // Update vote scores
  const voteScore =
    await MyGlobal.prisma.community_platform_post_vote_scores.upsert({
      where: { community_platform_post_id: props.postId },
      create: {
        id: v4() as string & tags.Format<"uuid">,
        community_platform_post_id: props.postId,
        upvote_count: upvoteCount,
        downvote_count: downvoteCount,
        total_score: totalScore,
        last_updated_at: now,
        created_at: now,
        updated_at: now,
      },
      update: {
        upvote_count: upvoteCount,
        downvote_count: downvoteCount,
        total_score: totalScore,
        last_updated_at: now,
        updated_at: now,
      },
      ...CommunityPlatformPostVoteScoreTransformer.select(),
    });
  return await CommunityPlatformPostVoteScoreTransformer.transform(voteScore);
}
