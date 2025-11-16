import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionRecommendationsRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionRecommendationsRequest";
import { IEconomicDiscussionRecommendationsList } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionRecommendationsList";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICrIPageIntegerRequired } from "@ORGANIZATION/PROJECT-api/lib/structures/ICrIPageIntegerRequired";
import { IEconomicDiscussionRecommendation } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionRecommendation";
import { IEconomicDiscussionCategorySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategorySummary";

export async function patchEconomicDiscussionMemberDiscoveryRecommendations(props: {
  body: IEconomicDiscussionRecommendationsRequest;
}): Promise<IEconomicDiscussionRecommendationsList> {
  // Extract request parameters with defaults
  const {
    categoryIds,
    searchKeywords,
    interactionHistory,
    maxResults = 10,
    minRelevanceScore = 0.1,
  } = props.body;

  // Validate maxResults constraint
  if (maxResults > 50 || maxResults < 1) {
    throw new HttpException("maxResults must be between 1 and 50", 400);
  }

  // Build article query with optional category filtering
  const articleWhere: Record<string, unknown> = {
    deleted_at: null,
    status: "approved",
  };

  // Get base articles, filtered by categories if specified
  let articles;
  if (categoryIds && categoryIds.length > 0) {
    // Find articles that are in the specified categories
    const articleCategories =
      await MyGlobal.prisma.economic_discussion_article_categories.findMany({
        where: {
          economic_discussion_category_id: { in: categoryIds },
        },
        select: { economic_discussion_article_id: true },
      });

    const articleIdsInCategories = articleCategories.map(
      (ac) => ac.economic_discussion_article_id,
    );

    articles = await MyGlobal.prisma.economic_discussion_articles.findMany({
      where: {
        ...articleWhere,
        id: { in: articleIdsInCategories },
      },
      take: maxResults * 2,
      orderBy: [{ view_count: "desc" }, { created_at: "desc" }],
      include: {
        member: {
          select: {
            username: true,
          },
        },
        moderator: {
          select: {
            username: true,
          },
        },
      },
    });
  } else {
    articles = await MyGlobal.prisma.economic_discussion_articles.findMany({
      where: articleWhere,
      take: maxResults * 2,
      orderBy: [{ view_count: "desc" }, { created_at: "desc" }],
      include: {
        member: {
          select: {
            username: true,
          },
        },
        moderator: {
          select: {
            username: true,
          },
        },
      },
    });
  }

  // Get comment counts for articles
  const articleIds = articles.map((article) => article.id);
  const commentCounts =
    articleIds.length > 0
      ? await MyGlobal.prisma.economic_discussion_comments.groupBy({
          by: ["economic_discussion_article_id"],
          where: {
            economic_discussion_article_id: { in: articleIds },
            deleted_at: null,
            status: "approved",
          },
          _count: {
            id: true,
          },
        })
      : [];

  // Create comment count map
  const commentCountMap = new Map(
    commentCounts.map((count) => [
      count.economic_discussion_article_id,
      count._count.id,
    ]),
  );

  // Get category information for articles
  const articleCategoryMap = new Map<
    string,
    IEconomicDiscussionCategorySummary[]
  >();
  if (articleIds.length > 0) {
    const articleCategories =
      await MyGlobal.prisma.economic_discussion_article_categories.findMany({
        where: {
          economic_discussion_article_id: { in: articleIds },
        },
      });

    // Fetch category details separately
    const categoryIds = articleCategories.map(
      (ac) => ac.economic_discussion_category_id,
    );
    const categories =
      categoryIds.length > 0
        ? await MyGlobal.prisma.economic_discussion_categories.findMany({
            where: {
              id: { in: categoryIds },
            },
            select: {
              id: true,
              code: true,
              name: true,
              display_order: true,
              is_active: true,
              article_count: true,
            },
          })
        : [];

    const categoryMap = new Map(
      categories.map((category) => [category.id, category]),
    );

    // Group categories by article
    for (const ac of articleCategories) {
      const category = categoryMap.get(ac.economic_discussion_category_id);
      if (category) {
        const categories =
          articleCategoryMap.get(ac.economic_discussion_article_id) || [];
        categories.push({
          id: category.id as string & tags.Format<"uuid">,
          code: category.code,
          name: category.name,
          displayOrder: category.display_order as number &
            tags.Type<"int32"> &
            tags.Minimum<0> &
            tags.Maximum<999>,
          isActive: category.is_active,
          articleCount: category.article_count as number &
            tags.Type<"int32"> &
            tags.Minimum<0> &
            tags.Maximum<100000>,
        });
        articleCategoryMap.set(ac.economic_discussion_article_id, categories);
      }
    }
  }

  // Calculate relevance scores and build recommendations
  const recommendations: IEconomicDiscussionRecommendation[] = [];

  for (const article of articles) {
    // Calculate base relevance score based on multiple factors
    let relevanceScore = 0.5; // Base score

    // Boost based on view count (normalize to 0-0.3 range)
    const viewBoost = Math.min(article.view_count / 1000, 0.3);
    relevanceScore += viewBoost;

    // Boost based on recency (0-0.2 range)
    const now = new Date();
    const articleAge = now.getTime() - article.created_at.getTime();
    const daysOld = articleAge / (1000 * 60 * 60 * 24);
    const recencyBoost = Math.max(0, 0.2 - (daysOld / 30) * 0.2);
    relevanceScore += recencyBoost;

    // Boost based on search keywords if provided
    if (searchKeywords && searchKeywords.length > 0) {
      const titleMatch = searchKeywords.some((keyword) =>
        article.title.toLowerCase().includes(keyword.toLowerCase()),
      );
      const contentMatch = searchKeywords.some((keyword) =>
        article.content.toLowerCase().includes(keyword.toLowerCase()),
      );

      if (titleMatch) relevanceScore += 0.1;
      if (contentMatch) relevanceScore += 0.05;
    }

    // Penalize articles already in interaction history
    if (interactionHistory && interactionHistory.includes(article.id)) {
      relevanceScore *= 0.7; // Reduce score by 30%
    }

    // Ensure score is within 0-1 range
    relevanceScore = Math.min(1, Math.max(0, relevanceScore));

    // Skip if below minimum relevance threshold
    if (relevanceScore < minRelevanceScore) {
      continue;
    }

    // Get categories for this article
    const categories = articleCategoryMap.get(article.id) || [];

    // Determine author name
    const authorName =
      article.member?.username || article.moderator?.username || "System";

    // Generate recommendation reason
    let recommendationReason =
      "Based on trending discussions in economic and political topics";
    if (categoryIds && categoryIds.length > 0) {
      recommendationReason += " matching your preferred categories";
    }
    if (searchKeywords && searchKeywords.length > 0) {
      recommendationReason += " and search interests";
    }
    if (relevanceScore > 0.7) {
      recommendationReason += " - highly relevant to your interests";
    }

    recommendations.push({
      id: article.id as string & tags.Format<"uuid">,
      title: article.title,
      content:
        article.content.substring(0, 500) +
        (article.content.length > 500 ? "..." : ""),
      authorName,
      categoryCount: categories.length as number &
        tags.Type<"int32"> &
        tags.Minimum<0> &
        tags.Maximum<50>,
      viewCount: article.view_count as number &
        tags.Type<"int32"> &
        tags.Minimum<0> &
        tags.Maximum<1000000>,
      commentCount: (commentCountMap.get(article.id) || 0) as number &
        tags.Type<"int32"> &
        tags.Minimum<0> &
        tags.Maximum<10000>,
      relevanceScore: relevanceScore as number &
        tags.Minimum<0> &
        tags.Maximum<1>,
      recommendationReason,
      categories,
      createdAt: toISOStringSafe(article.created_at),
      updatedAt: toISOStringSafe(article.updated_at),
      version: article.version,
      status: article.status,
    });
  }

  // Sort by relevance score descending and limit results
  recommendations.sort((a, b) => b.relevanceScore - a.relevanceScore);
  const limitedRecommendations = recommendations.slice(0, maxResults);

  // Create pagination metadata using the branded integer type
  const currentPage = 1;
  const totalPages = Math.ceil(recommendations.length / maxResults);
  const limitValue = maxResults;
  const totalRecords = recommendations.length;

  return {
    pagination: {
      current: currentPage.toString() as string & tags.Format<"uuid">,
      pages: totalPages.toString() as string & tags.Format<"uuid">,
      limit: limitValue.toString() as string & tags.Format<"uuid">,
      records: totalRecords.toString() as string & tags.Format<"uuid">,
    },
    data: limitedRecommendations,
  };
}
