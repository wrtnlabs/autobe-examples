import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticsBbsPopularArticles } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsPopularArticles";
import { IPoliticsBbsPopularArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsPopularArticle";

export async function getPoliticsBbsStatisticsPopular(): Promise<IPoliticsBbsPopularArticles> {
  // Recent articles (last 7 days) sorted by engagement
  const popularArticles = await MyGlobal.prisma.politics_bbs_articles.findMany({
    where: {
      state: "approved",
      deleted_at: null,
    },
    include: {
      category: {
        select: {
          name: true,
        },
      },
      creator: {
        select: {
          username: true,
        },
      },
    },
    orderBy: [{ view_count: "desc" }, { created_at: "desc" }],
    take: 20,
  });

  if (!popularArticles.length) {
    return {
      popularArticles: [],
    } satisfies IPoliticsBbsPopularArticles;
  }

  // Calculate popularity metrics for each article
  const nowIso = toISOStringSafe(new Date());
  const nowDate = new Date();

  const articlesWithMetrics = popularArticles
    .map((article) => {
      const articleCreatedAt = new Date(article.created_at);
      const hoursSinceCreation =
        (nowDate.getTime() - articleCreatedAt.getTime()) / (1000 * 60 * 60);
      const recentEngagementHours = Math.min(hoursSinceCreation, 48);

      // Popularity rating based on views relative to age
      const viewDensity = article.view_count / Math.max(hoursSinceCreation, 1);
      const baseRating = viewDensity * 100;

      // Recency bonus for recent content
      const recencyBonus = Math.min(
        Math.max(1.0, 2.0 - hoursSinceCreation / 48),
        1.5,
      );
      const rating = baseRating * recencyBonus;

      // Determine trend
      let trend: string;
      if (viewDensity > 8 && hoursSinceCreation < 24) {
        trend = "hot";
      } else if (viewDensity > 4 && hoursSinceCreation < 48) {
        trend = "trending";
      } else if (rating > 100) {
        trend = "up";
      } else {
        trend = "stable";
      }

      return {
        id: article.id as string & tags.Format<"uuid">,
        title: article.title,
        author: article.creator.username,
        category: article.category?.name || "Uncategorized",
        viewCount: article.view_count as number & tags.Type<"int32">,
        engagementHours: recentEngagementHours as number & tags.Type<"int32">,
        rating: rating,
        trend: trend,
        createdAt: toISOStringSafe(article.created_at),
      } satisfies IPoliticsBbsPopularArticle;
    })
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 15); // Top 15 most popular

  return {
    popularArticles: articlesWithMetrics,
  } satisfies IPoliticsBbsPopularArticles;
}
