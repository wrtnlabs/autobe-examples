import { ICommunityPlatformCommunityStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityStatistic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getCommunityPlatformAdminDashboard(props: {
  admin: AdminPayload;
}): Promise<ICommunityPlatformCommunityStatistic> {
  const currentTime = toISOStringSafe(new Date());
  // Get platform-wide statistics from appropriate tables
  const [totalUsers, totalPosts, totalComments, activeUsers] =
    await Promise.all([
      // Total users
      MyGlobal.prisma.community_platform_users.count({
        where: { deleted_at: null },
      }),
      // Total posts
      MyGlobal.prisma.community_platform_posts.count({
        where: { deleted_at: null },
      }),
      // Total comments
      MyGlobal.prisma.community_platform_comments.count({
        where: { deleted_at: null },
      }),
      // Active users (users with activity in last 24 hours)
      MyGlobal.prisma.community_platform_user_activities.count({
        where: {
          // Using created_at as fallback since last_activity_at doesn't exist
          created_at: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);
  // Create platform statistics object
  const statistics: ICommunityPlatformCommunityStatistic = {
    id: v4(),
    subscriber_count: totalUsers,
    post_count: totalPosts,
    comment_count: totalComments,
    daily_active_users: activeUsers,
    last_calculated_at: currentTime,
    created_at: currentTime,
    updated_at: currentTime,
  };
  return statistics;
}
