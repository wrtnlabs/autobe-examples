import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionRecentlyViewed } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionRecentlyViewed";
import { IEconomicDiscussionSortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSortOrder";
import { IPageIEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionArticle";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICrIPageIntegerRequired } from "@ORGANIZATION/PROJECT-api/lib/structures/ICrIPageIntegerRequired";
import { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";
import { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchEconomicDiscussionMemberDiscoveryRecentlyViewed(props: {
  member: MemberPayload;
  body: IEconomicDiscussionRecentlyViewed.IRequest;
}): Promise<IPageIEconomicDiscussionArticle.ISummary> {
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  // Since there's no explicit recently viewed table, we'll use the member's interaction history
  // Query articles based on search history or articles the member has interacted with
  const searchHistory =
    await MyGlobal.prisma.economic_discussion_search_history.findMany({
      where: {
        economic_discussion_member_id: props.member.id,
      },
      orderBy: {
        created_at: "desc",
      },
      take: 100, // Get recent search history
    });

  // Get unique article IDs from search queries (extracting potential article references)
  const potentialArticleIds = searchHistory
    .map((sh) => {
      // Try to extract potential article IDs from search queries
      const matches = sh.query_text.match(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      );
      return matches || [];
    })
    .flat()
    .filter((id, index, arr) => arr.indexOf(id) === index); // Remove duplicates

  // If no potential articles from search, get member's own recent articles as fallback
  let articleIds =
    potentialArticleIds.length > 0
      ? potentialArticleIds
      : (
          await MyGlobal.prisma.economic_discussion_articles.findMany({
            where: {
              economic_discussion_member_id: props.member.id,
            },
            orderBy: {
              created_at: "desc",
            },
            take: 50,
            select: {
              id: true,
            },
          })
        ).map((a) => a.id);

  // Apply date filtering if provided
  if (props.body.date_from || props.body.date_to) {
    const dateFilteredArticles =
      await MyGlobal.prisma.economic_discussion_articles.findMany({
        where: {
          id: { in: articleIds },
          ...(props.body.date_from && {
            created_at: { gte: props.body.date_from },
          }),
          ...(props.body.date_to && {
            created_at: { lte: props.body.date_to },
          }),
        },
        select: { id: true },
      });
    articleIds = dateFilteredArticles.map((a) => a.id);
  }

  // Apply deletion filtering
  const deletionFilter = props.body.include_deleted ? {} : { deleted_at: null };

  // Get total count and paginated articles
  const [articles, total] = await Promise.all([
    MyGlobal.prisma.economic_discussion_articles.findMany({
      where: {
        id: { in: articleIds },
        ...deletionFilter,
      },
      skip,
      take: limit,
      orderBy: {
        updated_at: props.body.sort_order === "asc" ? "asc" : "desc",
      },
      include: {
        member: true,
        moderator: true,
        economic_discussion_article_categories: {
          include: {
            category: true,
          },
        },
      },
    }),
    MyGlobal.prisma.economic_discussion_articles.count({
      where: {
        id: { in: articleIds },
        ...deletionFilter,
      },
    }),
  ]);

  // Calculate attachment and comment counts for all articles
  const [attachmentCounts, commentCounts] = await Promise.all([
    MyGlobal.prisma.economic_discussion_attachments.groupBy({
      by: ["economic_discussion_article_id"],
      where: {
        economic_discussion_article_id: { in: articles.map((a) => a.id) },
      },
      _count: {
        economic_discussion_article_id: true,
      },
    }),
    MyGlobal.prisma.economic_discussion_comments.groupBy({
      by: ["economic_discussion_article_id"],
      where: {
        economic_discussion_article_id: { in: articles.map((a) => a.id) },
      },
      _count: {
        economic_discussion_article_id: true,
      },
    }),
  ]);

  // Create lookup maps
  const attachmentMap = new Map(
    attachmentCounts.map((ac) => [
      ac.economic_discussion_article_id,
      ac._count.economic_discussion_article_id,
    ]),
  );
  const commentMap = new Map(
    commentCounts.map((cc) => [
      cc.economic_discussion_article_id,
      cc._count.economic_discussion_article_id,
    ]),
  );

  // Transform to summary format
  const data = articles.map((article) => {
    const memberAuthor = article.member
      ? {
          id: article.member.id,
          username: article.member.username,
          email_verified: article.member.email_verified,
          reputation_score: article.member.reputation_score,
          created_at: toISOStringSafe(article.member.created_at),
        }
      : undefined;

    const moderatorAuthor = article.moderator
      ? {
          id: article.moderator.id,
          username: article.moderator.username,
          moderation_level: article.moderator.moderation_level as
            | "standard"
            | "senior"
            | "admin",
          created_at: toISOStringSafe(article.moderator.created_at),
        }
      : undefined;

    const categories = article.economic_discussion_article_categories.map(
      (ac) => ({
        id: ac.category.id,
        code: ac.category.code,
        name: ac.category.name,
        display_order: ac.category.display_order,
        is_active: ac.category.is_active,
        article_count: ac.category.article_count,
      }),
    );

    return {
      id: article.id,
      title: article.title,
      view_count: article.view_count,
      created_at: toISOStringSafe(article.created_at),
      updated_at: toISOStringSafe(article.updated_at),
      economic_discussion_member_id: article.economic_discussion_member_id!,
      economic_discussion_moderator_id:
        article.economic_discussion_moderator_id!,
      member_author: memberAuthor,
      moderator_author: moderatorAuthor,
      categories,
      attachments_count: attachmentMap.get(article.id) || 0,
      comments_count: commentMap.get(article.id) || 0,
      status: article.status as "pending" | "approved" | "rejected",
    };
  });

  return {
    data,
    pagination: {
      current: page.toString(),
      limit: limit.toString(),
      records: total.toString(),
      pages: Math.ceil(total / limit).toString(),
    },
  };
}
