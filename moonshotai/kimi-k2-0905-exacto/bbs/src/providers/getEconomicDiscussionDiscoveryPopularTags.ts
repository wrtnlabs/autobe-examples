import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionPopularTags } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionPopularTags";
import { IEconomicDiscussionPopularTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionPopularTag";

export async function getEconomicDiscussionDiscoveryPopularTags(): Promise<IEconomicDiscussionPopularTags> {
  // Query to get popular tags (categories) with their article usage statistics
  const popularTags = await MyGlobal.prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      displayName: string;
      articleCount: number;
      trendingScore: number;
      createdAt: Date;
      lastUsedAt: Date;
    }>
  >`
    SELECT 
      c.id,
      c.name,
      c.name as displayName,
      COUNT(DISTINCT a.id) as articleCount,
      COUNT(DISTINCT a.id) * 1.0 as trendingScore,
      c.created_at as createdAt,
      MAX(a.created_at) as lastUsedAt
    FROM economic_discussion_categories c
    INNER JOIN economic_discussion_article_categories ac ON c.id = ac.economic_discussion_category_id
    INNER JOIN economic_discussion_articles a ON ac.economic_discussion_article_id = a.id
    WHERE c.is_active = true 
      AND c.deleted_at IS NULL
      AND a.status = 'approved'
      AND a.deleted_at IS NULL
    GROUP BY c.id, c.name, c.created_at
    ORDER BY articleCount DESC, lastUsedAt DESC
    LIMIT 50
  `;

  // Format the results to match the DTO structure
  const formattedTags: IEconomicDiscussionPopularTag[] = popularTags.map(
    (tag) => ({
      id: tag.id as string & tags.Format<"uuid">,
      name: tag.name,
      displayName: tag.displayName,
      articleCount: tag.articleCount as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      trendingScore: tag.trendingScore,
      createdAt: toISOStringSafe(tag.createdAt),
      lastUsedAt: toISOStringSafe(tag.lastUsedAt),
    }),
  );

  return {
    tags: formattedTags,
  };
}
