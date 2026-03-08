import { IEconomicPoliticalBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticleTag";
import { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import { IEconomicPoliticalBoardSectionAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSectionAnalytic";
import { IEconomicPoliticalBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardTag";
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

export async function patchEconomicPoliticalBoardAdminSectionsSectionIdAnalytics(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IEconomicPoliticalBoardSectionAnalytic.IRequest;
}): Promise<IEconomicPoliticalBoardSectionAnalytic> {
  const section =
    await MyGlobal.prisma.economic_political_board_sections.findFirst({
      where: { id: props.sectionId, deleted_at: null },
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
      },
    });
  if (section === null) {
    throw new HttpException("Section not found", 404);
  }
  const defaultStartDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const startDate: string & tags.Format<"date-time"> =
    props.body.startDate !== undefined
      ? props.body.startDate
      : toISOStringSafe(defaultStartDate);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentDateFilter: string & tags.Format<"date-time"> =
    toISOStringSafe(thirtyDaysAgo);
  const articleCountResult =
    await MyGlobal.prisma.economic_political_board_articles.count({
      where: {
        section_id: props.sectionId,
        deleted_at: null,
        ...(startDate !== undefined ? { created_at: { gte: startDate } } : {}),
      },
    });
  const commentCountResult =
    await MyGlobal.prisma.economic_political_board_comments.groupBy({
      by: ["article_id"],
      where: {
        article: {
          section_id: props.sectionId,
          deleted_at: null,
          ...(startDate !== undefined
            ? { created_at: { gte: startDate } }
            : {}),
        },
      },
      _count: { id: true },
    });
  const commentCount = commentCountResult.reduce(
    (sum, c) => sum + c._count.id,
    0,
  );
  const activeAuthorsResult =
    await MyGlobal.prisma.economic_political_board_articles.groupBy({
      where: {
        section_id: props.sectionId,
        deleted_at: null,
        ...(startDate !== undefined ? { created_at: { gte: startDate } } : {}),
      },
      by: ["author_id"],
      _count: { author_id: true },
    });
  const recentArticleCount =
    await MyGlobal.prisma.economic_political_board_articles.count({
      where: {
        section_id: props.sectionId,
        deleted_at: null,
        created_at: { gte: recentDateFilter },
      },
    });
  const tagDistributionResult =
    await MyGlobal.prisma.economic_political_board_article_tags.groupBy({
      by: ["tag_id"],
      where: {
        article: {
          section_id: props.sectionId,
          deleted_at: null,
          ...(startDate !== undefined
            ? { created_at: { gte: startDate } }
            : {}),
        },
      },
      _count: { tag_id: true },
      orderBy: { _count: { tag_id: "desc" } },
      take: 10,
    });
  const tagDistribution = await Promise.all(
    tagDistributionResult.map(async (tagStats) => {
      const tag =
        await MyGlobal.prisma.economic_political_board_tags.findUnique({
          where: { id: tagStats.tag_id },
          select: {
            id: true,
            name: true,
            created_at: true,
            updated_at: true,
          },
        });
      if (tag === null) {
        return null;
      }
      const articlesWithTag =
        await MyGlobal.prisma.economic_political_board_articles.findMany({
          where: {
            section_id: props.sectionId,
            deleted_at: null,
            articleTags: {
              some: { tag_id: tagStats.tag_id },
            },
          },
          select: { created_at: true },
        });
      return {
        id: tagStats.tag_id,
        section: {
          id: section.id,
          name: section.name,
          description: section.description,
          created_at: toISOStringSafe(section.created_at),
          articleCount: 0,
        } satisfies IEconomicPoliticalBoardSection.ISummary,
        tag: {
          id: tag.id,
          name: tag.name,
          created_at: toISOStringSafe(tag.created_at),
          updated_at: toISOStringSafe(tag.updated_at),
        } satisfies IEconomicPoliticalBoardTag.ISummary,
        articleCount: tagStats._count.tag_id,
        createdAt:
          articlesWithTag.length > 0
            ? toISOStringSafe(
                articlesWithTag.reduce(
                  (min, a) => (a.created_at < min ? a.created_at : min),
                  articlesWithTag[0].created_at,
                ),
              )
            : toISOStringSafe(new Date()),
        lastUsedAt:
          articlesWithTag.length > 0
            ? toISOStringSafe(
                articlesWithTag.reduce(
                  (max, a) => (a.created_at > max ? a.created_at : max),
                  articlesWithTag[0].created_at,
                ),
              )
            : toISOStringSafe(new Date()),
      } satisfies IEconomicPoliticalBoardArticleTag.ISummary;
    }),
  );
  const filteredTagDistribution = tagDistribution.filter(
    (tag): tag is IEconomicPoliticalBoardArticleTag.ISummary => tag !== null,
  );
  const metricFilter = props.body.metricFilter;
  const hasArticleCount =
    metricFilter === undefined || metricFilter.includes("articleCount");
  const hasCommentCount =
    metricFilter === undefined || metricFilter.includes("commentCount");
  const hasActiveAuthors =
    metricFilter === undefined || metricFilter.includes("activeAuthors");
  const hasRecentActivity =
    metricFilter === undefined || metricFilter.includes("recentActivity");
  const hasTagDistribution =
    metricFilter === undefined || metricFilter.includes("tagDistribution");
  const result: IEconomicPoliticalBoardSectionAnalytic = {
    section: {
      id: section.id,
      name: section.name,
      description: section.description,
      created_at: toISOStringSafe(section.created_at),
      articleCount: hasArticleCount ? articleCountResult : 0,
    } satisfies IEconomicPoliticalBoardSection.ISummary,
    articleCount: hasArticleCount ? articleCountResult : 0,
    commentCount: hasCommentCount ? commentCount : 0,
    activeAuthorCount: hasActiveAuthors ? activeAuthorsResult.length : 0,
    recentArticleCount: hasRecentActivity ? recentArticleCount : 0,
    tagDistribution: hasTagDistribution ? filteredTagDistribution : [],
  } satisfies IEconomicPoliticalBoardSectionAnalytic;
  return result;
}
