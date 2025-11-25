import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSearch";
import { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import { IPageIEconomicDiscussionSearchQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionSearchQuery";
import { IEconomicDiscussionSearchQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSearchQuery";
import { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";
import { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import { IEconomicDiscussionSearchMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSearchMetadata";
import { IEconomicDiscussionSearchFilters } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSearchFilters";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchEconomicDiscussionModeratorSearchGlobal(props: {
  moderator: ModeratorPayload;
  body: IEconomicDiscussionSearch.IRequest;
}): Promise<IPageIEconomicDiscussionSearchQuery.ISummary> {
  const startTime = Date.now();

  // Extract and validate search parameters
  const {
    query,
    categories,
    scope = "all",
    sort_by = "relevance",
    order = "desc",
    page = 1,
    limit = 20,
  } = props.body;

  // Calculate pagination
  const take = Math.min(limit, 100); // Max 100 items per page
  const skip = (page - 1) * take;

  // Build base WHERE conditions based on scope
  const baseWhere: Prisma.economic_discussion_articlesWhereInput = {
    deleted_at: null, // Only non-deleted content
  };

  // Add scope-based filtering
  if (scope === "member") {
    baseWhere.status = "approved";
  } else if (scope === "all") {
    baseWhere.status = { in: ["pending", "approved", "rejected"] };
  }

  // Add text search conditions if query provided
  const searchWhere: Prisma.economic_discussion_articlesWhereInput = {
    ...baseWhere,
    ...(query && query.trim()
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { content: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  // Handle category filtering - need to join with article_categories
  let whereConditions = searchWhere;
  if (categories && categories.length > 0) {
    const categoryIds = categories.map((cat) => cat.id);
    whereConditions = {
      ...searchWhere,
      economic_discussion_article_categories: {
        some: {
          category: {
            id: { in: categoryIds },
          },
        },
      },
    };
  }

  // Execute search with data
  const [articles, totalCount] = await Promise.all([
    MyGlobal.prisma.economic_discussion_articles.findMany({
      where: whereConditions,
      include: {
        economic_discussion_article_categories: {
          include: {
            category: {
              select: {
                id: true,
                code: true,
                name: true,
                display_order: true,
                is_active: true,
                article_count: true,
              },
            },
          },
        },
      },
      orderBy: getOrderByClause(sort_by, order),
      skip,
      take,
    }),
    MyGlobal.prisma.economic_discussion_articles.count({
      where: whereConditions,
    }),
  ]);

  // Calculate execution time
  const executionTimeMs = Date.now() - startTime;

  // Transform results to API format
  const transformedArticles: IEconomicDiscussionArticle.ISummary[] =
    articles.map((article) => {
      // This schema allows articles to have either member_id or moderator_id as undefined
      // The API requires both fields but can handle undefined values appropriately
      return {
        id: article.id,
        title: article.title,
        view_count: article.view_count,
        created_at: toISOStringSafe(article.created_at),
        updated_at: toISOStringSafe(article.updated_at),
        economic_discussion_member_id: article.economic_discussion_member_id
          ? (article.economic_discussion_member_id satisfies string as string)
          : (undefined as any),
        economic_discussion_moderator_id:
          article.economic_discussion_moderator_id
            ? (article.economic_discussion_moderator_id satisfies string as string)
            : (undefined as any),
        categories: article.economic_discussion_article_categories.map(
          (ac: any) => ({
            id: ac.category.id,
            code: ac.category.code,
            name: ac.category.name,
            display_order: ac.category.display_order,
            is_active: ac.category.is_active,
            article_count: ac.category.article_count,
          }),
        ),
        attachments_count: 0,
        comments_count: 0,
        status: article.status as "pending" | "approved" | "rejected",
      } satisfies IEconomicDiscussionArticle.ISummary;
    });

  // Build search metadata
  const searchMetadata: IEconomicDiscussionSearchMetadata = {
    query,
    filters: {}, // Could be populated with applied filters
    sort_order: getSortOrder(sort_by, order),
    execution_time_ms: executionTimeMs,
    performed_at: toISOStringSafe(new Date()),
    scope,
  };

  // Build final response structure
  const searchResult: IEconomicDiscussionSearchQuery.ISummary = {
    articles: transformedArticles,
    total_count: totalCount,
    search_metadata: searchMetadata,
  };

  return {
    data: [searchResult], // Single search result containing all articles
    pagination: {
      current: page - 1, // Convert to 0-based indexing
      pages: Math.ceil(totalCount / take),
      limit: take,
      records: totalCount,
    },
  };
}

// Helper function to determine sort order
function getSortOrder(
  sortBy: string,
  order: string,
): IEconomicDiscussionSearchMetadata["sort_order"] {
  const orderMap: Record<
    string,
    Record<string, IEconomicDiscussionSearchMetadata["sort_order"]>
  > = {
    relevance: { desc: "relevance", asc: "relevance" },
    created_at: { desc: "date_desc", asc: "date_asc" },
    updated_at: { desc: "date_desc", asc: "date_asc" },
    view_count: { desc: "views_desc", asc: "views_desc" },
  };
  return orderMap[sortBy]?.[order] || "relevance";
}

// Helper function to build Prisma order by clause
function getOrderByClause(
  sortBy: string,
  order: string,
): Prisma.economic_discussion_articlesOrderByWithRelationInput {
  switch (sortBy) {
    case "created_at":
      return { created_at: order as Prisma.SortOrder };
    case "updated_at":
      return { updated_at: order as Prisma.SortOrder };
    case "view_count":
      return { view_count: order as Prisma.SortOrder };
    case "relevance":
    default:
      return { created_at: "desc" }; // Default fallback - newest first for relevance
  }
}
