import { IEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardArticle";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicBoardArticles(props: {
  body: IEconomicBoardArticle.IRequest;
}): Promise<IPageIEconomicBoardArticle.ISum> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  // Validate page limit to prevent excessive memory usage
  if (page > 100)
    throw new HttpException("Page number exceeds maximum of 100", 400);
  // Build search filter for full-text search on title and content
  const searchWhere: any = {
    deleted_at: null,
  };
  // Handle tag filtering with AND logic
  let articleIdsWithAllTags: string[] = [];
  // Get the total count of articles matching the search criteria
  const total = await MyGlobal.prisma.economic_board_articles.count({
    where: searchWhere,
  });
  // Get the paginated list of articles
  // We need to include author display name, and we'll fetch tags and comment counts in separate queries
  const articles = await MyGlobal.prisma.economic_board_articles.findMany({
    where: searchWhere,
    skip,
    take: limit,
    orderBy: {
      created_at: "desc",
    },
    include: {
      author: {
        select: { display_name: true },
      },
    },
  });
  // Get article tags and count for summary
  const articleIds = articles.map((a) => a.id);
  const commentCounts: Record<string, number> = {};
  const tagCounts: Record<string, number> = {};
  const articleTags: Record<string, string[]> = {};
  // Get comment count for each article
  if (articleIds.length > 0) {
    const comments = await MyGlobal.prisma.economic_board_comments.findMany({
      where: {
        economic_board_articles_id: { in: articleIds },
      },
      select: { economic_board_articles_id: true },
    });
    // Count comments per article
    for (const comment of comments) {
      commentCounts[comment.economic_board_articles_id] =
        (commentCounts[comment.economic_board_articles_id] || 0) + 1;
    }
    // Get tags for each article
    const articleTagRecords =
      await MyGlobal.prisma.economic_board_search_article_tags.findMany({
        where: {
          article_id: { in: articleIds },
        },
        include: {
          tag: {
            select: { text: true },
          },
        },
      });
    // Group tags by article_id and get unique tags
    for (const articleTag of articleTagRecords) {
      if (!articleTags[articleTag.article_id]) {
        articleTags[articleTag.article_id] = [];
      }
      if (!tagCounts[articleTag.article_id]) {
        tagCounts[articleTag.article_id] = 0;
      }
      tagCounts[articleTag.article_id]++;
      articleTags[articleTag.article_id].push(articleTag.tag.text);
    }
  }
  // Transform results to IPageIEconomicBoardArticle.ISum structure
  const summaryData = articles.map((article) => {
    // Truncate title to 100 characters with ellipsis
    const truncatedTitle =
      article.title.length > 100
        ? `${article.title.substring(0, 100)}...`
        : article.title;
    // Get tag array for this article - limit to 5 tags, add count of additional tags
    const tagsForArticle = articleTags[article.id] || [];
    const displayedTags = tagsForArticle.slice(0, 5);
    return {
      id: article.id,
      title: truncatedTitle satisfies string as string,
      author_name: article.author.display_name satisfies string as string,
      created_at: toISOStringSafe(
        article.created_at,
      ) satisfies string as string & tags.Format<"date-time">,
      comment_count:
        commentCounts[article.id] ||
        (0 satisfies number as number & tags.Type<"int32">),
      tag_count:
        tagCounts[article.id] ||
        (0 satisfies number as number & tags.Type<"int32">),
      tags: displayedTags,
    };
  });
  // Pagination information (1-indexed)
  const pagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  } satisfies IPage.IPagination;
  return {
    pagination,
    data: summaryData,
  };
}
