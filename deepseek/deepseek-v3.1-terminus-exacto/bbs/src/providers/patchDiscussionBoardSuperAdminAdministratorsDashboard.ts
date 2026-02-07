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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminAdministratorsDashboard(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardAdministratorPromotionApproval.IRequest;
}): Promise<IPageIDiscussionBoardAdministratorPromotionApproval.ISummary> {
  const page = 1;
  const limit = 100;
  const thirtyDaysAgo = toISOStringSafe(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  );
  try {
    const [
      totalUsers,
      newUsersThisMonth,
      totalArticles,
      newArticlesThisMonth,
      totalComments,
      newCommentsThisMonth,
      totalSections,
      activeSections,
      totalModerationActions,
      pendingContentFlags,
      pendingCommentReports,
    ] = await Promise.all([
      MyGlobal.prisma.discussion_board_users.count({
        where: { deleted_at: null },
      }),
      MyGlobal.prisma.discussion_board_users.count({
        where: { deleted_at: null, created_at: { gte: thirtyDaysAgo } },
      }),
      MyGlobal.prisma.discussion_board_articles.count({
        where: { deleted_at: null, status: "published" },
      }),
      MyGlobal.prisma.discussion_board_articles.count({
        where: {
          deleted_at: null,
          status: "published",
          created_at: { gte: thirtyDaysAgo },
        },
      }),
      MyGlobal.prisma.discussion_board_comments.count({
        where: { deleted_at: null },
      }),
      MyGlobal.prisma.discussion_board_comments.count({
        where: { deleted_at: null, created_at: { gte: thirtyDaysAgo } },
      }),
      MyGlobal.prisma.discussion_board_sections.count({
        where: { deleted_at: null },
      }),
      MyGlobal.prisma.discussion_board_sections.count({
        where: { deleted_at: null, status: "active" },
      }),
      MyGlobal.prisma.discussion_board_moderation_logs.count({
        where: { deleted_at: null },
      }),
      MyGlobal.prisma.discussion_board_content_flags.count({
        where: { deleted_at: null, status: "pending" },
      }),
      MyGlobal.prisma.discussion_board_comment_reports.count({
        where: { status: "pending" },
      }),
    ]);
    const statisticsRecord: IDiscussionBoardAdministratorPromotionApproval.ISummary =
      {
        id: v4(),
      };
    const totalRecords = 1;
    const totalPages = Math.ceil(totalRecords / limit);
    return {
      pagination: {
        current: page,
        limit: limit,
        records: totalRecords,
        pages: totalPages,
      },
      data: [statisticsRecord],
    };
  } catch (error) {
    throw new HttpException(
      "Failed to retrieve administrative dashboard statistics",
      500,
    );
  }
}
