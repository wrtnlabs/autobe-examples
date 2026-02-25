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

export async function getCommunityPlatformModeratorPostsPostIdVoteScore(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostVoteScore> {
  // Verify post exists and get community ID
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: props.postId, deleted_at: null },
    select: {
      id: true,
      community_id: true,
    },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }
  // Check if moderator has access to this community
  const moderatorAccess =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_id: post.community_id,
        user_id: props.moderator.id,
        is_active: true,
        deleted_at: null,
      },
    });
  if (!moderatorAccess) {
    throw new HttpException(
      "You do not have moderator access to this community",
      403,
    );
  }
  // Query vote score record
  const voteScore =
    await MyGlobal.prisma.community_platform_post_vote_scores.findFirst({
      where: { community_platform_post_id: props.postId },
      ...CommunityPlatformPostVoteScoreTransformer.select(),
    });
  if (voteScore) {
    return await CommunityPlatformPostVoteScoreTransformer.transform(voteScore);
  }
  // Return default values if no vote score exists
  return {
    id: v4(),
    upvote_count: 0,
    downvote_count: 0,
    total_score: 0,
    last_updated_at: null,
    created_at: toISOStringSafe(new Date()),
    updated_at: toISOStringSafe(new Date()),
  };
}
