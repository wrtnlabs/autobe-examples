import { ICommunityPlatformPostVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteScore";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformPostVoteScoreTransformer } from "../transformers/CommunityPlatformPostVoteScoreTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformUserPostsPostIdVoteScore(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostVoteScore> {
  // Verify post exists
  await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
    where: { id: props.postId },
  });
  // Get vote score record from the vote scores table
  const voteScoreRecord =
    await MyGlobal.prisma.community_platform_post_vote_scores.findUnique({
      where: { community_platform_post_id: props.postId },
      ...CommunityPlatformPostVoteScoreTransformer.select(),
    });
  if (voteScoreRecord) {
    return await CommunityPlatformPostVoteScoreTransformer.transform(
      voteScoreRecord,
    );
  }
  // If no vote score record exists, return zero values
  // Use current timestamp for created_at/updated_at
  const now = toISOStringSafe(new Date());
  return {
    id: v4(),
    upvote_count: 0,
    downvote_count: 0,
    total_score: 0,
    last_updated_at: null,
    created_at: now,
    updated_at: now,
  };
}
