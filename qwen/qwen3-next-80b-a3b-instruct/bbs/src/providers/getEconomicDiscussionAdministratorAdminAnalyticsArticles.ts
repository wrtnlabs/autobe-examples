import { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import { IEconomicDiscussionArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticleTag";
import { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicDiscussionAdministratorAdminAnalyticsArticles(props: {
  administrator: AdministratorPayload;
}): Promise<IEconomicDiscussionArticle> {
  // Execute raw SQL query to compute all analytics metrics in a single optimized operation
  const result = await MyGlobal.prisma.$queryRawUnsafe<{
    total_articles: number;
    published_articles: number;
    deleted_articles: number;
    avg_content_length: number;
    avg_comment_count: number;
    top_tags: string[];
  }>(`
    SELECT
      COUNT(*) AS total_articles,
      COUNT(*) - COUNT(deleted_at) AS published_articles,
      COUNT(deleted_at) AS deleted_articles,
      AVG(LENGTH(content)) AS avg_content_length,
      AVG(comment_count) AS avg_comment_count,
      (
        SELECT ARRAY(
          SELECT tag.name
          FROM economic_discussion_article_tags atag
          JOIN economic_discussion_tags tag ON atag.tag_id = tag.id
          WHERE atag.article_id IN (SELECT id FROM economic_discussion_articles)
          GROUP BY tag.name
          ORDER BY COUNT(*) DESC
          LIMIT 10
        )
      ) AS top_tags
    FROM economic_discussion_articles
  `);
  // Transform raw result into the required IEconomicDiscussionArticle format
  return {
    id: v4() as string & tags.Format<"uuid">, // Dummy ID since this is aggregate data
    title: "Admin Analytics Summary",
    posted_time: null,
    author: {
      id: props.administrator.id,
    },
    tags: result.top_tags.map((tag) => ({
      name: tag,
    })),
    comment_count: Math.round(result.avg_comment_count) as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
  };
}
