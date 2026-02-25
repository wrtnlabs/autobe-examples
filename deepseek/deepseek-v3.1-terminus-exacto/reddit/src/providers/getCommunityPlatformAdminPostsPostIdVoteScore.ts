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

export async function getCommunityPlatformAdminPostsPostIdVoteScore(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostVoteScore> {
  // First verify the post exists
  await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
    where: { id: props.postId },
  });
  // Retrieve the vote score for this post using the correct unique constraint
  const voteScore =
    await MyGlobal.prisma.community_platform_post_vote_scores.findUnique({
      where: { community_platform_post_id: props.postId },
      include: {
        post: true,
      },
    });
  // If no vote score exists yet (no votes cast on this post), return default values
  if (voteScore === null) {
    // Construct default vote score response with proper formatted fields
    return {
      id: v4(),
      upvote_count: 0,
      downvote_count: 0,
      total_score: 0,
      last_updated_at: null,
      created_at: "1970-01-01T00:00:00.000Z",
      updated_at: "1970-01-01T00:00:00.000Z",
    } satisfies ICommunityPlatformPostVoteScore;
  }
  // Transform and return the actual vote score data using transformer
  return await CommunityPlatformPostVoteScoreTransformer.transform(voteScore);
}
