import { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionArticle";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomicDiscussionArticleAtSummaryTransformer } from "../transformers/EconomicDiscussionArticleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicDiscussionArticles(props: {
  body: IEconomicDiscussionArticle.IRequest;
}): Promise<IPageIEconomicDiscussionArticle.ISummary> {
  const {
    search_term,
    section_id,
    tag_filters,
    page = 1,
    limit = 20,
    sort_order = "desc",
  } = props.body;
  const skip = (page - 1) * limit;
  // Build where conditions for articles - using correct field names from schema
  const whereInput: Record<string, unknown> = {};
  // Search term filtering (fuzzy match on title and content)
  if (search_term) {
    whereInput.OR = [
      { title: { contains: search_term } },
      { content: { contains: search_term } },
    ];
  }
  // Section filtering - using 'section' relation name, not 'section_id'
  if (section_id) {
    whereInput.section = { id: section_id };
  }
  // Tag filtering - ALL tags must match (AND logic)
  if (tag_filters && tag_filters.length > 0) {
    // Create a subquery to find article_ids that have ALL specified tags
    const articleIdsWithAllTags =
      await MyGlobal.prisma.economic_discussion_article_tags
        .findMany({
          where: {
            tag: { in: tag_filters },
          },
          select: { article: { select: { id: true } } },
        })
        .then((tags) => {
          // Group by article_id and count occurrences
          const tagCounts = new Map<string, number>();
          for (const tag of tags) {
            const count = tagCounts.get(tag.article.id) || 0;
            tagCounts.set(tag.article.id, count + 1);
          }
          // Return article_ids where tag count equals the number of requested tags (AND logic)
          return Array.from(tagCounts.entries())
            .filter(([_, count]) => count === tag_filters.length)
            .map(([articleId]) => articleId);
        });
    whereInput.id = {
      in: articleIdsWithAllTags,
    };
  }
  // Build order by
  const orderByInput = (
    sort_order === "asc"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const }
  ) satisfies Prisma.economic_discussion_articlesOrderByWithRelationInput;
  // Retrieve articles with pagination
  const articles = await MyGlobal.prisma.economic_discussion_articles.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    select: {
      id: true,
      title: true,
      created_at: true,
      section: {
        select: {
          id: true,
          name: true,
        },
      },
      author: {
        select: {
          id: true,
          display_name: true,
          bio: true,
        },
      },
      economic_discussion_article_tags: {
        select: {
          tag: true,
        },
      },
      _count: {
        select: {
          economic_discussion_comments: true, // Fixed: matches transformer's expected property name
        },
      },
    },
  });
  // Count total matching records
  const total = await MyGlobal.prisma.economic_discussion_articles.count({
    where: whereInput,
  });
  // Transform each article using the transformer
  const transformedArticles = await ArrayUtil.asyncMap(
    articles,
    EconomicDiscussionArticleAtSummaryTransformer.transform,
  );
  return {
    data: transformedArticles,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
