import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneAdminCommunitiesCommunityIdMetrics(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneCommunity.IMetric> {
  const community =
    await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
      where: {
        id: props.communityId,
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        subscriber_count: true,
        created_at: true,
      },
    });
  const [
    postsMetrics,
    postsByType,
    commentsMetrics,
    moderatorsByRole,
    activeBansCount,
  ] = await Promise.all([
    MyGlobal.prisma.reddit_clone_posts.aggregate({
      where: {
        reddit_clone_community_id: props.communityId,
        deleted_at: null,
      },
      _count: true,
      _avg: {
        score: true,
      },
      _max: {
        created_at: true,
      },
    }),
    MyGlobal.prisma.reddit_clone_posts.groupBy({
      where: {
        reddit_clone_community_id: props.communityId,
        deleted_at: null,
      },
      by: ["post_type"],
      _count: true,
    }),
    MyGlobal.prisma.reddit_clone_comments.aggregate({
      where: {
        post: {
          reddit_clone_community_id: props.communityId,
        },
        deleted_at: null,
      },
      _count: true,
      _avg: {
        score: true,
      },
      _max: {
        created_at: true,
      },
    }),
    MyGlobal.prisma.reddit_clone_community_moderators.groupBy({
      where: {
        reddit_clone_communities_id: props.communityId,
        deleted_at: null,
      },
      by: ["role"],
      _count: true,
    }),
    MyGlobal.prisma.reddit_clone_bans.count({
      where: {
        community_id: props.communityId,
        lifted_at: null,
        deleted_at: null,
      },
    }),
  ]);
  const postsByTypeMap = new Map(
    postsByType.map((p) => [p.post_type, p._count]),
  );
  const moderatorsByRoleMap = new Map(
    moderatorsByRole.map((m) => [m.role, m._count]),
  );
  const totalEngagement = postsMetrics._count + commentsMetrics._count;
  const activityScore =
    totalEngagement > 0
      ? ((postsMetrics._avg.score ?? 0) + (commentsMetrics._avg.score ?? 0)) / 2
      : null;
  return {
    community_id: community.id,
    community_name: community.name,
    subscriber_count: community.subscriber_count,
    created_at: community.created_at.toISOString(),
    total_posts: postsMetrics._count,
    posts_by_type: {
      text: postsByTypeMap.get("text") ?? 0,
      link: postsByTypeMap.get("link") ?? 0,
      image: postsByTypeMap.get("image") ?? 0,
    } satisfies IRedditCloneCommunity.IMetric["posts_by_type"],
    avg_post_score: postsMetrics._avg.score,
    most_recent_post_at: postsMetrics._max.created_at?.toISOString() ?? null,
    total_comments: commentsMetrics._count,
    avg_comment_score: commentsMetrics._avg.score,
    most_recent_comment_at:
      commentsMetrics._max.created_at?.toISOString() ?? null,
    total_moderators: moderatorsByRole.reduce((sum, m) => sum + m._count, 0),
    moderators_by_role: {
      owner: moderatorsByRoleMap.get("owner") ?? 0,
      mod: moderatorsByRoleMap.get("mod") ?? 0,
    } satisfies IRedditCloneCommunity.IMetric["moderators_by_role"],
    active_bans: activeBansCount,
    total_engagement: totalEngagement,
    activity_score: activityScore,
  } satisfies IRedditCloneCommunity.IMetric;
}
