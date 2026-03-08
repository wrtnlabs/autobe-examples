import { IDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDashboardSummary";
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

export async function getDiscussionBoardAdminDashboard(props: {
  admin: AdminPayload;
}): Promise<IDashboardSummary> {
  // Calculate timestamp for 7 days ago
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  // Execute all independent aggregation queries in parallel
  const [
    articlesTotal,
    articlesRecent,
    articlesBySection,
    commentsTotal,
    commentsPerArticle,
    membersTotal,
    membersActive,
    membersBanned,
    membersRecent,
    sectionsTotal,
    mostActiveSectionGroup,
    adminRequestsPending,
    adminRequestsApproved,
    adminRequestsRejected,
  ] = await Promise.all([
    // Article Statistics
    MyGlobal.prisma.discussion_board_articles.count({
      where: { deleted_at: null },
    }),
    MyGlobal.prisma.discussion_board_articles.count({
      where: {
        deleted_at: null,
        created_at: { gte: sevenDaysAgo },
      },
    }),
    MyGlobal.prisma.discussion_board_articles.groupBy({
      by: ["section_id"],
      where: { deleted_at: null },
      _count: { id: true },
    }),
    // Comment Statistics
    MyGlobal.prisma.discussion_board_comments.count({
      where: { deleted_at: null },
    }),
    MyGlobal.prisma.discussion_board_comments.groupBy({
      by: ["discussion_board_article_id"],
      where: { deleted_at: null },
      _count: { id: true },
    }),
    // Member Statistics
    MyGlobal.prisma.discussion_board_members.count({
      where: { deleted_at: null },
    }),
    MyGlobal.prisma.discussion_board_members.count({
      where: { deleted_at: null, banned: false },
    }),
    MyGlobal.prisma.discussion_board_members.count({
      where: { deleted_at: null, banned: true },
    }),
    MyGlobal.prisma.discussion_board_members.count({
      where: {
        deleted_at: null,
        created_at: { gte: sevenDaysAgo },
      },
    }),
    // Section Statistics
    MyGlobal.prisma.discussion_board_sections.count(),
    MyGlobal.prisma.discussion_board_articles.groupBy({
      by: ["section_id"],
      where: { deleted_at: null },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 1,
    }),
    // Admin Request Statistics
    MyGlobal.prisma.discussion_board_admin_requests.count({
      where: { deleted_at: null, status: "pending" },
    }),
    MyGlobal.prisma.discussion_board_admin_requests.count({
      where: { status: "approved" },
    }),
    MyGlobal.prisma.discussion_board_admin_requests.count({
      where: { status: "rejected" },
    }),
  ]);
  // Fetch section names for articles_bySection
  const sectionIds = articlesBySection.map((item) => item.section_id);
  const sections =
    sectionIds.length > 0
      ? await MyGlobal.prisma.discussion_board_sections.findMany({
          where: { id: { in: sectionIds } },
          select: { id: true, name: true },
        })
      : [];
  const sectionMap = new Map(sections.map((s) => [s.id, s.name]));
  // Build articles_bySection array
  const articlesBySectionResult: IDashboardSummary.ISectionCount[] =
    articlesBySection.map(
      (item) =>
        ({
          sectionId: item.section_id,
          name: sectionMap.get(item.section_id) ?? "",
          count: item._count.id,
        }) satisfies IDashboardSummary.ISectionCount,
    );
  // Calculate average comments per article
  const totalComments = commentsPerArticle.reduce(
    (sum, item) => sum + item._count.id,
    0,
  );
  const articleCountWithComments = commentsPerArticle.length;
  const averageCommentsPerArticle =
    articleCountWithComments > 0 ? totalComments / articleCountWithComments : 0;
  // Fetch most active section details
  let mostActiveSectionResult: IDashboardSummary.IMostActiveSection | null =
    null;
  if (mostActiveSectionGroup.length > 0) {
    const section = await MyGlobal.prisma.discussion_board_sections.findUnique({
      where: { id: mostActiveSectionGroup[0].section_id },
      select: { id: true, name: true },
    });
    if (section !== null) {
      mostActiveSectionResult = {
        id: section.id,
        name: section.name,
        article_count: mostActiveSectionGroup[0]._count.id,
      } satisfies IDashboardSummary.IMostActiveSection;
    }
  }
  return {
    articles_total: articlesTotal,
    articles_recent: articlesRecent,
    articles_bySection: articlesBySectionResult,
    comments_total: commentsTotal,
    comments_averagePerArticle: averageCommentsPerArticle,
    members_total: membersTotal,
    members_active: membersActive,
    members_banned: membersBanned,
    members_recent: membersRecent,
    sections_total: sectionsTotal,
    sections_mostActive: mostActiveSectionResult,
    adminRequests_pending: adminRequestsPending,
    adminRequests_approved: adminRequestsApproved,
    adminRequests_rejected: adminRequestsRejected,
  } satisfies IDashboardSummary;
}
