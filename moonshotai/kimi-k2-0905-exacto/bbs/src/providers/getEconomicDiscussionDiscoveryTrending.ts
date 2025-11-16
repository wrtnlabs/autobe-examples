import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionTrendingList } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionTrendingList";
import { IEconomicDiscussionTrendingArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionTrendingArticle";
import { IEconomicDiscussionArticleAuthor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticleAuthor";

export async function getEconomicDiscussionDiscoveryTrending(): Promise<IEconomicDiscussionTrendingList> {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Get articles with basic fields only
  const articles = await MyGlobal.prisma.economic_discussion_articles.findMany({
    where: {
      status: "approved",
      created_at: {
        gte: twentyFourHoursAgo,
      },
      deleted_at: null,
    },
    select: {
      id: true,
      title: true,
      status: true,
      version: true,
      view_count: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      economic_discussion_member_id: true,
      economic_discussion_moderator_id: true,
    },
    orderBy: [{ view_count: "desc" }, { created_at: "desc" }],
    take: 40,
  });

  // Build the trending articles
  const trendingArticles: IEconomicDiscussionTrendingArticle[] = [];

  for (const article of articles) {
    // Get comment count separately
    const commentCount =
      await MyGlobal.prisma.economic_discussion_comments.count({
        where: {
          economic_discussion_article_id: article.id,
          deleted_at: null,
        },
      });

    // Calculate engagement score
    const hoursSinceCreated = Math.max(
      0.1,
      (now.getTime() - article.created_at.getTime()) / (60 * 60 * 1000),
    );
    const baseScore = article.view_count * 1.2 + commentCount * 3.5;
    const recencyMultiplier = Math.exp(-hoursSinceCreated / 12);
    const engagementScore = Math.max(0, baseScore * recencyMultiplier);

    // Build author information safely
    let author: IEconomicDiscussionArticleAuthor;

    if (article.economic_discussion_member_id) {
      const authorUser =
        await MyGlobal.prisma.economic_discussion_members.findUnique({
          where: { id: article.economic_discussion_member_id },
          select: {
            id: true,
            username: true,
            reputation_score: true,
          },
        });

      if (authorUser) {
        author = {
          id: authorUser.id as string & tags.Format<"uuid">,
          username: authorUser.username satisfies string as string,
          type: "member",
          reputation_score:
            authorUser.reputation_score satisfies number as number,
        };
      } else {
        author = {
          id: "00000000-0000-0000-0000-000000000000" as string &
            tags.Format<"uuid">,
          username: "Deleted User" satisfies string as string,
          type: "member",
          reputation_score: 0 satisfies number as number,
        };
      }
    } else if (article.economic_discussion_moderator_id) {
      const moderator =
        await MyGlobal.prisma.economic_discussion_moderators.findUnique({
          where: { id: article.economic_discussion_moderator_id },
          select: { id: true, username: true },
        });

      author = {
        id: (moderator?.id ??
          "00000000-0000-0000-0000-000000000000") as string &
          tags.Format<"uuid">,
        username: (moderator?.username ??
          "Moderator") satisfies string as string,
        type: "moderator",
        reputation_score: 150 satisfies number as number,
      };
    } else {
      // Fallback for articles without author
      author = {
        id: "00000000-0000-0000-0000-000000000000" as string &
          tags.Format<"uuid">,
        username: "Unknown Author" satisfies string as string,
        type: "member",
        reputation_score: 0 satisfies number as number,
      };
    }

    // Get simple category names manually to avoid complex joins
    const categoryRecords =
      await MyGlobal.prisma.economic_discussion_article_categories.findMany({
        where: {
          economic_discussion_article_id: article.id,
          category: {
            is_active: true,
            deleted_at: null,
          },
        },
        select: {
          category: {
            select: { name: true },
          },
        },
      });

    const categoryNames = categoryRecords
      .map((c) => c.category.name)
      .filter(Boolean) as string[] & tags.MinItems<1> & tags.MaxItems<3>;

    // Skip articles with no valid categories
    if (categoryNames.length === 0) {
      continue;
    }

    // Build trending article
    trendingArticles.push({
      id: article.id as string & tags.Format<"uuid">,
      title: article.title satisfies string as string,
      status: article.status as "pending" | "approved" | "rejected",
      version: article.version satisfies number as number,
      view_count: article.view_count satisfies number as number,
      comment_count: commentCount satisfies number as number,
      created_at: toISOStringSafe(article.created_at),
      updated_at: toISOStringSafe(article.updated_at),
      deleted_at: article.deleted_at
        ? toISOStringSafe(article.deleted_at)
        : undefined,
      category_names: categoryNames,
      author: author,
      engagement_score: (Math.round(engagementScore * 100) /
        100) satisfies number as number,
      published_at: toISOStringSafe(article.created_at), // For trending this equals created_at
      thumbnail_url: undefined, // No attachments in simplified query
    });
  }

  // Sort by engagement score and limit results
  trendingArticles.sort((a, b) => b.engagement_score - a.engagement_score);

  if (trendingArticles.length > 20) {
    trendingArticles.splice(20);
  }

  return {
    articles: trendingArticles as IEconomicDiscussionTrendingArticle[] &
      tags.MinItems<1> &
      tags.MaxItems<20>,
    generated_at: toISOStringSafe(now),
  };
}
