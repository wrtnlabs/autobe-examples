import { IDiscussionBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentReport";
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

export async function patchDiscussionBoardAdminReportsContent(props: {
  admin: AdminPayload;
  body: IDiscussionBoardContentReport.IRequest;
}): Promise<IPageIDiscussionBoardContentReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  // Parse date filters
  const dateFrom = props.body.date_from ? new Date(props.body.date_from) : null;
  const dateTo = props.body.date_to ? new Date(props.body.date_to) : null;
  // Build where conditions for articles
  const articleWhere: Prisma.discussion_board_articlesWhereInput = {
    deleted_at: null,
  };
  if (dateFrom || dateTo) {
    const created_at: Prisma.DateTimeFilter = {};
    if (dateFrom) {
      created_at.gte = dateFrom;
    }
    if (dateTo) {
      created_at.lte = dateTo;
    }
    articleWhere.created_at = created_at;
  }
  if (props.body.section_id) {
    articleWhere.discussion_board_section_id = props.body.section_id;
  }
  // Build where conditions for comments
  const commentWhere: Prisma.discussion_board_commentsWhereInput = {};
  if (dateFrom || dateTo) {
    const created_at: Prisma.DateTimeFilter = {};
    if (dateFrom) {
      created_at.gte = dateFrom;
    }
    if (dateTo) {
      created_at.lte = dateTo;
    }
    commentWhere.created_at = created_at;
  }
  if (props.body.section_id) {
    commentWhere.article = {
      discussion_board_section_id: props.body.section_id,
    };
  }
  // Filter by content type
  if (props.body.content_type === "articles") {
    // Only count articles - comments will be 0
  } else if (props.body.content_type === "comments") {
    // Only count comments - articles will be 0
    articleWhere.id = { in: [] };
  }
  // Get total articles
  const totalArticles = await MyGlobal.prisma.discussion_board_articles.count({
    where: articleWhere,
  });
  // Get total comments
  const totalComments =
    props.body.content_type === "articles"
      ? 0
      : await MyGlobal.prisma.discussion_board_comments.count({
          where: commentWhere,
        });
  // Get active sections count
  const activeSectionsData =
    await MyGlobal.prisma.discussion_board_articles.groupBy({
      by: ["discussion_board_section_id"],
      where: {
        ...articleWhere,
        deleted_at: null,
      },
      _count: { id: true },
    });
  const activeSectionsCount = activeSectionsData.length;
  // Get total sections
  const totalSections = await MyGlobal.prisma.discussion_board_sections.count({
    where: { deleted_at: null },
  });
  // Get unique authors
  const uniqueAuthorsData =
    await MyGlobal.prisma.discussion_board_articles.groupBy({
      by: ["discussion_board_member_id"],
      where: {
        ...articleWhere,
        deleted_at: null,
      },
      _count: { id: true },
    });
  const uniqueAuthors = uniqueAuthorsData.length;
  // Calculate average articles per section
  const averageArticlesPerSection =
    activeSectionsCount > 0 ? totalArticles / activeSectionsCount : 0;
  // Get section breakdown
  const sectionBreakdownData =
    await MyGlobal.prisma.discussion_board_articles.groupBy({
      by: ["discussion_board_section_id"],
      where: {
        ...articleWhere,
        deleted_at: null,
      },
      _count: { id: true },
    });
  const sectionIds = sectionBreakdownData.map(
    (d) => d.discussion_board_section_id,
  );
  const sections = await MyGlobal.prisma.discussion_board_sections.findMany({
    where: { id: { in: sectionIds }, deleted_at: null },
    select: { id: true, name: true },
  });
  const sectionMap = new Map(sections.map((s) => [s.id, s.name]));
  const sectionBreakdown: IDiscussionBoardContentReport.ISectionBreakdown[] =
    sectionBreakdownData.map((d) => ({
      section_id: d.discussion_board_section_id as string & tags.Format<"uuid">,
      section_name: sectionMap.get(d.discussion_board_section_id) ?? "Unknown",
      article_count: d._count.id,
    }));
  // Get tag statistics
  const articleIds = await MyGlobal.prisma.discussion_board_articles.findMany({
    where: articleWhere,
    select: { id: true },
  });
  const articleIdSet = new Set(articleIds.map((a) => a.id));
  const tagUsageData =
    await MyGlobal.prisma.discussion_board_article_tags.groupBy({
      by: ["discussion_board_tag_id"],
      where: {
        discussion_board_article_id: { in: Array.from(articleIdSet) },
      },
      _count: { id: true },
    });
  const tagIds = tagUsageData.map((d) => d.discussion_board_tag_id);
  const tagList = await MyGlobal.prisma.discussion_board_tags.findMany({
    where: { id: { in: tagIds }, deleted_at: null },
    select: { id: true, name: true },
  });
  const tagMap = new Map(tagList.map((t) => [t.id, t.name]));
  const tagStatistics: IDiscussionBoardContentReport.ITagUsage[] =
    tagUsageData.map((d) => ({
      tag_id: d.discussion_board_tag_id as string & tags.Format<"uuid">,
      tag_name: tagMap.get(d.discussion_board_tag_id) ?? "Unknown",
      usage_count: d._count.id,
    }));
  // Calculate engagement trend
  let engagementTrend: "increasing" | "stable" | "decreasing" = "stable";
  if (dateFrom && dateTo) {
    const duration = dateTo.getTime() - dateFrom.getTime();
    const prevPeriodStart = new Date(dateFrom.getTime() - duration);
    const prevPeriodEnd = dateFrom;
    const prevArticleWhere: Prisma.discussion_board_articlesWhereInput = {
      created_at: { gte: prevPeriodStart, lt: prevPeriodEnd },
      deleted_at: null,
    };
    if (props.body.section_id) {
      prevArticleWhere.discussion_board_section_id = props.body.section_id;
    }
    const prevCount = await MyGlobal.prisma.discussion_board_articles.count({
      where: prevArticleWhere,
    });
    if (prevCount > 0) {
      if (totalArticles > prevCount * 1.1) {
        engagementTrend = "increasing";
      } else if (totalArticles < prevCount * 0.9) {
        engagementTrend = "decreasing";
      }
    }
  }
  // Get peak activity date
  let peakActivityDate: (string & tags.Format<"date">) | null = null;
  if (totalArticles > 0 && dateFrom && dateTo) {
    const dailyCounts = await MyGlobal.prisma.$queryRaw<
      Array<{
        date: string;
        count: number;
      }>
    >`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM discussion_board_articles
      WHERE created_at >= ${dateFrom}
        AND created_at <= ${dateTo}
        AND deleted_at IS NULL
      GROUP BY DATE(created_at)
      ORDER BY count DESC
      LIMIT 1
    `;
    if (dailyCounts[0]?.date) {
      peakActivityDate = dailyCounts[0].date as string & tags.Format<"date">;
    }
  }
  // Create report record
  const report: IDiscussionBoardContentReport.ISummary = {
    id: v4() as string & tags.Format<"uuid">,
    period_start: (props.body.date_from ??
      toISOStringSafe(new Date())) as string & tags.Format<"date-time">,
    period_end: (props.body.date_to ?? toISOStringSafe(new Date())) as string &
      tags.Format<"date-time">,
    total_articles: totalArticles,
    total_comments: totalComments,
    active_sections_count: activeSectionsCount,
    total_sections: totalSections,
    unique_authors: uniqueAuthors,
    average_articles_per_section: averageArticlesPerSection,
    section_breakdown: sectionBreakdown,
    tag_statistics: tagStatistics,
    engagement_trend: engagementTrend,
    peak_activity_date: peakActivityDate,
    created_at: toISOStringSafe(new Date()) as string &
      tags.Format<"date-time">,
  };
  // Pagination - single report
  const total = 1;
  const totalPages = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: totalPages,
    } satisfies IPage.IPagination,
    data: page <= totalPages ? [report] : [],
  } satisfies IPageIDiscussionBoardContentReport.ISummary;
}
