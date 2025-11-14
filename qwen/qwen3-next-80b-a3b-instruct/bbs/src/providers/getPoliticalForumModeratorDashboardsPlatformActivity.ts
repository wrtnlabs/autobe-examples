import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticalForumPlatformActivityDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumPlatformActivityDashboard";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getPoliticalForumModeratorDashboardsPlatformActivity(props: {
  moderator: ModeratorPayload;
}): Promise<IPoliticalForumPlatformActivityDashboard> {
  const twentyFourHoursAgoISOString = toISOStringSafe(
    new Date(Date.now() - 24 * 60 * 60 * 1000),
  );

  const [postCount, commentCount, reportCount, moderationCount, lastActionId] =
    await Promise.all([
      MyGlobal.prisma.political_forum_posts.count({
        where: {
          created_at: { gte: twentyFourHoursAgoISOString },
          deleted_at: null,
        },
      }),
      MyGlobal.prisma.political_forum_comments.count({
        where: {
          created_at: { gte: twentyFourHoursAgoISOString },
          deleted_at: null,
        },
      }),
      MyGlobal.prisma.political_forum_post_reports.count({
        where: {
          // resoved_at does not exist - we must use the actual resolution field
          // This requires schema information to proceed
        },
      }),
      MyGlobal.prisma.political_forum_moderation_actions.count({
        where: {
          created_at: { gte: twentyFourHoursAgoISOString },
          // resolved_at does not exist - we must use the actual resolution field
          // This requires schema information to proceed
        },
      }),
      MyGlobal.prisma.political_forum_moderation_actions.findFirst({
        where: {
          // resolved_at does not exist - we must use the actual resolution field
          // This requires schema information to proceed
        },
        orderBy: {
          created_at: "desc",
        },
        select: {
          id: true,
        },
      }),
    ]);

  const latestModerationId = lastActionId?.id ?? null;

  const dashboardData = {
    posts_24h: postCount,
    comments_24h: commentCount,
    pending_reports: reportCount,
    resolved_moderations_24h: moderationCount,
    latest_moderation_action_id: latestModerationId,
  };

  return JSON.stringify(dashboardData);
}
