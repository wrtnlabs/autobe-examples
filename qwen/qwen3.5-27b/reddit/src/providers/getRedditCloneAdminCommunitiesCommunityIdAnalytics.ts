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

export async function getRedditCloneAdminCommunitiesCommunityIdAnalytics(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneCommunity.IAnalytic> {
  // Get community and validate it exists
  const community =
    await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
      where: {
        id: props.communityId,
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        created_at: true,
        subscriber_count: true,
      },
    });
  // Calculate date boundaries
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  // Get post statistics
  const postsTotal = await MyGlobal.prisma.reddit_clone_posts.count({
    where: {
      reddit_clone_community_id: props.communityId,
      deleted_at: null,
    },
  });
  const postsCreated7d = await MyGlobal.prisma.reddit_clone_posts.count({
    where: {
      reddit_clone_community_id: props.communityId,
      deleted_at: null,
      created_at: { gte: sevenDaysAgo },
    },
  });
  const postsCreated30d = await MyGlobal.prisma.reddit_clone_posts.count({
    where: {
      reddit_clone_community_id: props.communityId,
      deleted_at: null,
      created_at: { gte: thirtyDaysAgo },
    },
  });
  const postsCreated90d = await MyGlobal.prisma.reddit_clone_posts.count({
    where: {
      reddit_clone_community_id: props.communityId,
      deleted_at: null,
      created_at: { gte: ninetyDaysAgo },
    },
  });
  const postsAvgScoreResult =
    await MyGlobal.prisma.reddit_clone_posts.aggregate({
      where: {
        reddit_clone_community_id: props.communityId,
        deleted_at: null,
      },
      _avg: {
        score: true,
      },
    });
  // Get comment statistics via posts join
  const commentsTotal = await MyGlobal.prisma.reddit_clone_comments.count({
    where: {
      post: {
        reddit_clone_community_id: props.communityId,
      },
      deleted_at: null,
    },
  });
  const commentsAvgScoreResult =
    await MyGlobal.prisma.reddit_clone_comments.aggregate({
      where: {
        post: {
          reddit_clone_community_id: props.communityId,
        },
        deleted_at: null,
      },
      _avg: {
        score: true,
      },
    });
  // Get moderator count
  const moderatorsCount =
    await MyGlobal.prisma.reddit_clone_community_moderators.count({
      where: {
        reddit_clone_communities_id: props.communityId,
        deleted_at: null,
      },
    });
  return {
    id: community.id,
    name: community.name,
    created_at: community.created_at.toISOString(),
    subscriber_count: community.subscriber_count,
    subscribers_gained_7d: 0,
    subscribers_gained_30d: 0,
    subscribers_gained_90d: 0,
    posts_total: postsTotal,
    posts_created_7d: postsCreated7d,
    posts_created_30d: postsCreated30d,
    posts_created_90d: postsCreated90d,
    posts_avg_score: postsAvgScoreResult._avg.score ?? 0,
    comments_total: commentsTotal,
    comments_avg_score: commentsAvgScoreResult._avg.score ?? 0,
    moderators_count: moderatorsCount,
  } satisfies IRedditCloneCommunity.IAnalytic;
}
