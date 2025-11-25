import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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

export async function patchEconomicDiscussionModeratorDiscoveryRecommendations(props: {
  body: IEconomicDiscussionRecommendationsRequest;
}): Promise<IEconomicDiscussionRecommendationsList> {
  const maxResults = props.body.maxResults ?? 10;
  const minRelevanceScore = props.body.minRelevanceScore ?? 0.1;

  if (maxResults < 1 || maxResults > 50) {
    throw new HttpException("maxResults must be between 1 and 50", 400);
  }

  // Validate category IDs if provided
  if (props.body.categoryIds && props.body.categoryIds.length > 0) {
    const validCategories =
      await MyGlobal.prisma.economic_discussion_categories.count({
        where: {
          id: { in: props.body.categoryIds },
          is_active: true,
          deleted_at: null,
        },
      });

    if (validCategories !== props.body.categoryIds.length) {
      throw new HttpException(
        "One or more category IDs are invalid or inactive",
        400,
      );
    }
  }

  // Build base query conditions
  const whereConditions: Prisma.economic_discussion_articlesWhereInput = {
    status: "approved",
    deleted_at: null,
  };

  // Add category filtering if provided
  if (props.body.categoryIds && props.body.categoryIds.length > 0) {
    whereConditions.economic_discussion_article_categories = {
      some: {
        economic_discussion_category_id: {
          in: props.body.categoryIds,
        },
      },
    };
  }

  // Filter out articles from interaction history
  if (
    props.body.interactionHistory &&
    props.body.interactionHistory.length > 0
  ) {
    whereConditions.id = {
      notIn: props.body.interactionHistory,
    };
  }

  // Get articles with comprehensive relationships
  const articles = await MyGlobal.prisma.economic_discussion_articles.findMany({
    where: whereConditions,
    include: {
      economic_discussion_article_categories: {
        include: {
          category: true,
        },
      },
      economic_discussion_comments: {
        where: {
          status: "approved",
          deleted_at: null,
        },
      },
    },
    orderBy: {
      created_at: "desc",
    },
    take: Math.max(maxResults * 3, 100), // Get sufficient candidates for relevance filtering
  });

  // Calculate relevance scores
  const scoredRecommendations: IEconomicDiscussionRecommendation[] = articles
    .map((article) => {
      let relevanceScore = 0;
      let factors: string[] = [];

      // Category alignment score (0-0.4)
      if (props.body.categoryIds && props.body.categoryIds.length > 0) {
        const articleCategories =
          article.economic_discussion_article_categories.map(
            (ac: any) => ac.category.id,
          );
        const categoryOverlap = articleCategories.filter((id: string) =>
          props.body.categoryIds!.includes(id),
        ).length;
        const categoryScore =
          (categoryOverlap / props.body.categoryIds!.length) * 0.4;
        relevanceScore += categoryScore;
        if (categoryScore > 0) {
          factors.push("category alignment");
        }
      }

      // Keyword relevance score (0-0.3) - using better text analysis
      if (props.body.searchKeywords && props.body.searchKeywords.length > 0) {
        const content = (article.title + " " + article.content).toLowerCase();
        let totalKeywordScore = 0;
        let matchedKeywords = 0;

        props.body.searchKeywords.forEach((keyword) => {
          const keywordLower = keyword.toLowerCase();
          const titleMatches =
            (article.title.toLowerCase().split(keywordLower).length - 1) * 2; // Title matches weighted higher
          const contentMatches = content.split(keywordLower).length - 1;
          const keywordRelevance =
            Math.min(titleMatches + contentMatches, 3) / 3; // Cap at 3 matches

          if (keywordRelevance > 0) {
            totalKeywordScore += keywordRelevance;
            matchedKeywords++;
          }
        });

        const keywordScore =
          (totalKeywordScore / Math.max(props.body.searchKeywords.length, 1)) *
          0.3;
        relevanceScore += keywordScore;
        if (matchedKeywords > 0) {
          factors.push(
            `${matchedKeywords} keyword${matchedKeywords > 1 ? "s" : ""} matched`,
          );
        }
      }

      // Engagement score (0-0.2)
      const engagementScore = Math.min(
        (article.view_count / 1000) * 0.1 +
          (article.economic_discussion_comments.length / 50) * 0.1,
        0.2,
      );
      relevanceScore += engagementScore;
      if (engagementScore > 0.1) {
        factors.push("high community engagement");
      }

      // Recency score (0-0.1)
      const daysSinceCreation =
        (new Date().getTime() - new Date(article.created_at).getTime()) /
        (1000 * 60 * 60 * 24);
      const recencyScore = Math.max(0, (30 - daysSinceCreation) / 30) * 0.1;
      relevanceScore += recencyScore;
      if (recencyScore > 0.05) {
        factors.push("recently published");
      }

      // Consistency score boost for quality content
      if (
        article.economic_discussion_article_categories.length >= 2 &&
        article.economic_discussion_comments.length >= 3 &&
        article.view_count >= 50
      ) {
        relevanceScore += 0.05;
        factors.push("quality content indicators");
      }

      // Determine author name using member/moderator IDs
      const authorName =
        article.economic_discussion_member_id ||
        article.economic_discussion_moderator_id ||
        "Community Contributor";

      let recommendationReason = "Recommended based on";
      if (factors.length > 0) {
        recommendationReason += " " + factors.slice(0, 2).join(" and ");
      } else {
        recommendationReason += " trending economic discussions";
      }

      return {
        id: article.id,
        title: article.title,
        content:
          article.content.substring(0, 500) +
          (article.content.length > 500 ? "..." : ""),
        authorName,
        categoryCount: article.economic_discussion_article_categories.length,
        viewCount: article.view_count,
        commentCount: article.economic_discussion_comments.length,
        relevanceScore: Math.round(relevanceScore * 100) / 100,
        recommendationReason,
        categories: article.economic_discussion_article_categories.map(
          (ac: any) => ({
            id: ac.category.id,
            code: ac.category.code,
            name: ac.category.name,
            displayOrder: ac.category.display_order,
            isActive: ac.category.is_active,
            articleCount: ac.category.article_count,
          }),
        ),
        createdAt: toISOStringSafe(article.created_at),
        updatedAt: toISOStringSafe(article.updated_at),
        version: article.version,
        status: article.status,
      };
    })
    .filter((rec) => rec.relevanceScore >= minRelevanceScore)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, maxResults);

  // Build pagination metadata
  const totalRecords = scoredRecommendations.length;
  const pages = Math.ceil(totalRecords / maxResults);

  return {
    data: scoredRecommendations,
    pagination: {
      current: "1" as ICrIPageIntegerRequired,
      limit: maxResults.toString() as ICrIPageIntegerRequired,
      records: totalRecords.toString() as ICrIPageIntegerRequired,
      pages: pages.toString() as ICrIPageIntegerRequired,
    },
  };
}
