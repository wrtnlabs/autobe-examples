import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
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

export async function getCommunityPlatformUserPostsPostIdAnalytics(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPost.IAnalytic> {
  // Verify post exists
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId, deleted_at: null },
      select: {
        id: true,
        user_id: true,
        community_id: true,
      },
    },
  );
  // Check if user is the author
  if (post.user_id !== props.user.id) {
    // Check if user is a moderator of the community
    const moderator =
      await MyGlobal.prisma.community_platform_community_moderators.findFirst({
        where: {
          community_id: post.community_id,
          user_id: props.user.id, // Fixed field name
          deleted_at: null,
        },
      });
    if (!moderator) {
      throw new HttpException("Access denied", 403);
    }
  }
  // Get total views count
  const totalViews = await MyGlobal.prisma.community_platform_post_views.count({
    where: { community_platform_post_id: props.postId },
  });
  // Get unique viewers count - use groupBy instead of distinct in count
  const uniqueViewersResult =
    await MyGlobal.prisma.community_platform_post_views.groupBy({
      by: ["community_platform_user_id"],
      where: { community_platform_post_id: props.postId },
      _count: { _all: true },
    });
  const uniqueViewers = uniqueViewersResult.length;
  // Get voting data
  const voteScore =
    await MyGlobal.prisma.community_platform_post_vote_scores.findUnique({
      where: { community_platform_post_id: props.postId },
    });
  // Get comment count
  const totalComments = await MyGlobal.prisma.community_platform_comments.count(
    {
      where: {
        community_platform_post_id: props.postId,
        deleted_at: null,
      },
    },
  );
  return {
    total_views: totalViews,
    unique_viewers: uniqueViewers,
    upvotes: voteScore?.upvote_count ?? 0,
    downvotes: voteScore?.downvote_count ?? 0,
    total_score: voteScore?.total_score ?? 0,
    total_comments: totalComments,
  } satisfies ICommunityPlatformPost.IAnalytic;
}
