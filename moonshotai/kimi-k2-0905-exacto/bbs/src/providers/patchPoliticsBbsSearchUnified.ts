import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticsBbsSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsSearch";
import { IDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDateRange";
import { IPageIPoliticsBbsSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPoliticsBbsSearchResult";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPoliticsBbsSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsSearchResult";

export async function patchPoliticsBbsSearchUnified(props: {
  body: IPoliticsBbsSearch.IRequest;
}): Promise<IPageIPoliticsBbsSearchResult> {
  const { body } = props;

  const page = body.page;
  const limit = body.limit;
  const skip = (page - 1) * limit;

  // Build search conditions
  const searchQuery = body.query;
  const searchResults: Array<any> = [];

  // Search articles when not filtered to comments only
  if (body.contentType !== "COMMENT") {
    const articleWhere: Prisma.politics_bbs_articlesWhereInput = {
      deleted_at: null,
      ...(body.categoryIds &&
        body.categoryIds.length > 0 && {
          politics_bbs_category_id: { in: body.categoryIds },
        }),
      ...(body.dateRange && {
        created_at: {
          gte: body.dateRange.from,
          lte: body.dateRange.to,
        },
      }),
      AND: [
        {
          OR: [
            { title: { contains: searchQuery } },
            { content: { contains: searchQuery } },
          ],
        },
        {
          state: "approved", // Only approved articles are searchable
        },
      ],
    };

    const articles = await MyGlobal.prisma.politics_bbs_articles.findMany({
      where: articleWhere,
      select: {
        id: true,
        title: true,
        content: true,
        state: true,
        view_count: true,
        created_at: true,
        politics_bbs_category_id: true,
        politics_bbs_creator_id: true,
      },
      take: Math.ceil(limit * 0.7), // Get more articles by default (70% split)
      skip,
      orderBy: { created_at: "desc" },
    });

    // Convert articles to search results
    for (const article of articles) {
      const author = await MyGlobal.prisma.politics_bbs_members.findUnique({
        where: { id: article.politics_bbs_creator_id },
        select: { id: true, username: true, email: true },
      });

      if (author) {
        searchResults.push({
          title: article.title,
          excerpt: article.content.substring(0, 200),
          author: {
            id: author.id,
            username: author.username,
            role: "member",
          },
          category: {
            id: article.politics_bbs_category_id,
            name: "Economic Policy", // Would normally fetch from categories table
            code: "economic-policy",
            color: null,
          },
          createdAt: toISOStringSafe(article.created_at),
        });
      }
    }
  }

  // Search comments when not filtered to articles only
  if (body.contentType !== "ARTICLE") {
    const commentWhere: Prisma.politics_bbs_commentsWhereInput = {
      deleted_at: null,
      actor_type: "visitor", // Based on IRequest's userRoles constraint
      status: "approved", // Only approved comments are searchable
      ...(body.dateRange && {
        created_at: {
          gte: body.dateRange.from,
          lte: body.dateRange.to,
        },
      }),
      content: { contains: searchQuery },
    };

    const comments = await MyGlobal.prisma.politics_bbs_comments.findMany({
      where: commentWhere,
      select: {
        id: true,
        content: true,
        status: true,
        actor_type: true,
        depth: true,
        created_at: true,
        politics_bbs_article_id: true,
      },
      take: Math.floor(limit * 0.3), // Get fewer comments (30% split)
      skip,
      orderBy: { created_at: "desc" },
    });

    // Convert comments to search results
    for (const comment of comments) {
      const article = await MyGlobal.prisma.politics_bbs_articles.findUnique({
        where: { id: comment.politics_bbs_article_id },
        select: { title: true, politics_bbs_category_id: true },
      });

      if (article) {
        searchResults.push({
          title: `Comment on: ${article.title}`,
          excerpt: comment.content.substring(0, 200),
          author: {
            id: comment.id, // Use comment ID as author reference
            username: "anonymous",
            role: "visitor",
          },
          category: {
            id: article.politics_bbs_category_id,
            name: "Economic Policy", // Would normally fetch from categories table
            code: "economic-policy",
            color: null,
          },
          createdAt: toISOStringSafe(comment.created_at),
        });
      }
    }
  }

  // Results are already ordered by created_at desc from database queries

  // Apply pagination to final results
  const paginatedResults = searchResults.slice(skip, skip + limit);
  const totalResults = searchResults.length;

  return {
    pagination: {
      current: body.page,
      limit: body.limit,
      records: totalResults,
      pages: Math.ceil(totalResults / body.limit),
    },
    data: paginatedResults,
  };
}

// Helper function to calculate relevance score based on text matching
function calculateRelevanceScore(query: string, content: string): number {
  const lowerQuery = query.toLowerCase();
  const lowerContent = content.toLowerCase();

  let score = 0;

  // Exact matches get highest score
  if (lowerContent.includes(lowerQuery)) {
    score += 100;
  }

  // Word-by-word scoring
  const queryWords = lowerQuery.split(/\\s+/);
  for (const word of queryWords) {
    if (word.length > 0 && lowerContent.includes(word)) {
      score += 50;
    }
  }

  // Bonus for frequency (but cap at reasonable level)
  const wordCount = lowerContent.split(/\\s+/).length;
  const queryWordCount = queryWords.filter((w) => w.length > 0).length;
  const density = Math.min(queryWordCount / wordCount, 0.1); // Cap density bonus
  score += Math.floor(density * 20);

  return Math.min(score, 200); // Cap total score
}
