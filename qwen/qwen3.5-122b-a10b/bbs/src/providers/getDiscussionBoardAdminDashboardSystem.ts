import { IDiscussionBoardSectionArticleCount } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionArticleCount";
import { IDiscussionBoardSystemDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemDashboard";
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

export async function getDiscussionBoardAdminDashboardSystem(props: {
  admin: AdminPayload;
}): Promise<IDiscussionBoardSystemDashboard> {
  // Member statistics
  const totalMembers = await MyGlobal.prisma.discussion_board_members.count({
    where: { deleted_at: null },
  });
  const activeMembers = await MyGlobal.prisma.discussion_board_members.count({
    where: { ban_status: "active", deleted_at: null },
  });
  const bannedMembers = await MyGlobal.prisma.discussion_board_members.count({
    where: { ban_status: "banned", deleted_at: null },
  });
  // Article statistics
  const totalArticles = await MyGlobal.prisma.discussion_board_articles.count({
    where: { deleted_at: null },
  });
  // Articles by section using groupBy
  const articlesBySectionRaw =
    await MyGlobal.prisma.discussion_board_articles.groupBy({
      by: ["discussion_board_section_id"],
      where: { deleted_at: null },
      _count: { id: true },
    });
  // Get section names for the articles
  const sectionIds = articlesBySectionRaw.map(
    (r) => r.discussion_board_section_id,
  );
  const sections = await MyGlobal.prisma.discussion_board_sections.findMany({
    where: { id: { in: sectionIds }, deleted_at: null },
    select: { id: true, name: true },
  });
  const sectionMap = new Map(sections.map((s) => [s.id, s.name]));
  const bySection: IDiscussionBoardSectionArticleCount[] =
    articlesBySectionRaw.map((r) => ({
      section_id: r.discussion_board_section_id as string & tags.Format<"uuid">,
      section_name: sectionMap.get(r.discussion_board_section_id) || "Unknown",
      count: r._count.id,
    }));
  // Comment statistics
  const totalComments = await MyGlobal.prisma.discussion_board_comments.count({
    where: { deleted_at: null },
  });
  // Section statistics
  const activeSections = await MyGlobal.prisma.discussion_board_sections.count({
    where: { deleted_at: null },
  });
  // Activity metrics from audit logs
  const now = new Date();
  const last24Hours = await MyGlobal.prisma.discussion_board_audit_logs.count({
    where: {
      created_at: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
    },
  });
  const last7Days = await MyGlobal.prisma.discussion_board_audit_logs.count({
    where: {
      created_at: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
    },
  });
  const last30Days = await MyGlobal.prisma.discussion_board_audit_logs.count({
    where: {
      created_at: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
    },
  });
  // Pending admin requests
  const pendingAdminRequests =
    await MyGlobal.prisma.discussion_board_admin_requests.count({
      where: { status: "pending" },
    });
  // Active system settings
  const activeSystemSettings =
    await MyGlobal.prisma.discussion_board_system_settings.count({
      where: { deleted_at: null },
    });
  // Calculate ratios with division-by-zero protection
  const articlesPerMember = totalMembers > 0 ? totalArticles / totalMembers : 0;
  const commentsPerArticle =
    totalArticles > 0 ? totalComments / totalArticles : 0;
  return {
    members: {
      total: totalMembers,
      active: activeMembers,
      banned: bannedMembers,
    },
    articles: {
      total: totalArticles,
      bySection,
    },
    comments: {
      total: totalComments,
    },
    sections: {
      active: activeSections,
    },
    activity: {
      last24Hours,
      last7Days,
      last30Days,
    },
    adminRequests: {
      pending: pendingAdminRequests,
    },
    systemSettings: {
      active: activeSystemSettings,
    },
    ratios: {
      articlesPerMember,
      commentsPerArticle,
    },
  } satisfies IDiscussionBoardSystemDashboard;
}
