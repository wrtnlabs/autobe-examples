import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationDashboard";
import { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getDiscussionBoardModeratorDashboardModerationOverview(props: {
  moderator: ModeratorPayload;
}): Promise<IDiscussionBoardModerationDashboard> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    pendingReportsCount,
    pendingReportsForArticles,
    activeSuspensionsCount,
    recentModerationActionsCount,
    recentModerationActionsData,
    recentPublishedArticlesCount,
  ] = await Promise.all([
    MyGlobal.prisma.discussion_board_content_reports.count({
      where: {
        status: "pending",
      },
    }),
    MyGlobal.prisma.discussion_board_content_reports.findMany({
      where: {
        status: "pending",
      },
      select: {
        discussion_board_article_id: true,
      },
      distinct: ["discussion_board_article_id"],
    }),
    MyGlobal.prisma.discussion_board_account_actions.count({
      where: {
        status: "active",
      },
    }),
    MyGlobal.prisma.discussion_board_moderation_logs.count({
      where: {
        created_at: {
          gte: twentyFourHoursAgo,
        },
      },
    }),
    MyGlobal.prisma.discussion_board_moderation_logs.findMany({
      where: {
        created_at: {
          gte: twentyFourHoursAgo,
        },
      },
      orderBy: {
        created_at: "desc",
      },
      take: 10,
    }),
    MyGlobal.prisma.discussion_board_articles.count({
      where: {
        status: "published",
        published_at: {
          gte: twentyFourHoursAgo,
        },
      },
    }),
  ]);

  return {
    pending_reports_count: pendingReportsCount,
    flagged_articles_count: pendingReportsForArticles.length,
    active_suspensions_count: activeSuspensionsCount,
    recent_moderation_actions_count: recentModerationActionsCount,
    recent_moderation_actions: [],
    recent_published_articles_count: recentPublishedArticlesCount,
  };
}
