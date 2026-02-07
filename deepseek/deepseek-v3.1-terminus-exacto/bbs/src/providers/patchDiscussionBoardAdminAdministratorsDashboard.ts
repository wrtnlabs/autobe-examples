import { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionApproval";
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

export async function patchDiscussionBoardAdminAdministratorsDashboard(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAdministratorPromotionApproval.IRequest;
}): Promise<IPageIDiscussionBoardAdministratorPromotionApproval.ISummary> {
  // Calculate date ranges for filtering (default to last 30 days)
  const thirtyDaysAgo = toISOStringSafe(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  );
  const sevenDaysAgo = toISOStringSafe(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  );
  // Query user statistics (total and recent)
  const totalUsers = await MyGlobal.prisma.discussion_board_users.count({
    where: { deleted_at: null },
  });
  const recentUsers = await MyGlobal.prisma.discussion_board_users.count({
    where: {
      deleted_at: null,
      created_at: { gte: thirtyDaysAgo },
    },
  });
  // Query article statistics
  const totalArticles = await MyGlobal.prisma.discussion_board_articles.count({
    where: { deleted_at: null },
  });
  const recentArticles = await MyGlobal.prisma.discussion_board_articles.count({
    where: {
      deleted_at: null,
      created_at: { gte: thirtyDaysAgo },
    },
  });
  const publishedArticles =
    await MyGlobal.prisma.discussion_board_articles.count({
      where: {
        deleted_at: null,
        status: "published",
      },
    });
  // Query comment statistics
  const totalComments = await MyGlobal.prisma.discussion_board_comments.count({
    where: { deleted_at: null },
  });
  const recentComments = await MyGlobal.prisma.discussion_board_comments.count({
    where: {
      deleted_at: null,
      created_at: { gte: thirtyDaysAgo },
    },
  });
  // Query moderation statistics
  const totalModerationActions =
    await MyGlobal.prisma.discussion_board_moderation_logs.count({
      where: { deleted_at: null },
    });
  const recentModerationActions =
    await MyGlobal.prisma.discussion_board_moderation_logs.count({
      where: {
        deleted_at: null,
        performed_at: { gte: thirtyDaysAgo },
      },
    });
  // Query content flags statistics
  const pendingFlags =
    await MyGlobal.prisma.discussion_board_content_flags.count({
      where: {
        deleted_at: null,
        status: "pending",
      },
    });
  // Create dashboard summary object
  const dashboardSummary: IDiscussionBoardAdministratorPromotionApproval.ISummary =
    {
      id: v4() as string & tags.Format<"uuid">,
    };
  // Return paginated response (single page for dashboard summary)
  return {
    pagination: {
      current: 1,
      limit: 1,
      records: 1,
      pages: 1,
    } satisfies IPage.IPagination,
    data: [dashboardSummary],
  };
}
