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

export async function deleteCommunityPlatformUserPostsPostIdVotesVoteId(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First, verify the post exists and is not deleted
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: {
        id: props.postId,
        deleted_at: null,
      },
    },
  );
  // Verify the vote exists and belongs to the authenticated user
  const vote =
    await MyGlobal.prisma.community_platform_post_votes.findUniqueOrThrow({
      where: {
        id: props.voteId,
        post_id: props.postId,
        user_id: props.user.id,
      },
    });
  // Use transaction for data consistency
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Delete the vote record
    await tx.community_platform_post_votes.delete({
      where: { id: props.voteId },
    });
    // Update the post's aggregated vote score
    const voteScore = await tx.community_platform_post_vote_scores.findUnique({
      where: { community_platform_post_id: props.postId },
    });
    if (voteScore) {
      const upvoteDelta = vote.vote_type === "upvote" ? -1 : 0;
      const downvoteDelta = vote.vote_type === "downvote" ? -1 : 0;
      const totalScoreDelta = upvoteDelta - downvoteDelta;
      await tx.community_platform_post_vote_scores.update({
        where: { id: voteScore.id },
        data: {
          upvote_count: { decrement: upvoteDelta },
          downvote_count: { decrement: downvoteDelta },
          total_score: { decrement: totalScoreDelta },
          last_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });
    }
    // Handle karma impact reversal
    const karmaImpact =
      await tx.community_platform_vote_karma_impact_of_posts.findUnique({
        where: { community_platform_post_vote_id: props.voteId },
      });
    if (karmaImpact) {
      // Delete the karma impact record
      await tx.community_platform_vote_karma_impact_of_posts.delete({
        where: { id: karmaImpact.id },
      });
      // Update the main karma impact record
      await tx.community_platform_vote_karma_impacts.delete({
        where: { id: karmaImpact.community_platform_vote_karma_impact_id },
      });
    }
  });
}
