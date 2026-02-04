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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicDiscussionSuperAdministratorAdminAnalyticsArticles(props: {
  superAdministrator: SuperadministratorPayload;
}): Promise<IEconomicDiscussionArticle> {
  // Query database for analytics
  const sql = `
    SELECT
      COUNT(*) AS total_count,
      COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) AS published_count,
      COUNT(CASE WHEN deleted_at IS NOT NULL THEN 1 END) AS deleted_count,
      AVG(CHAR_LENGTH(content)) AS avg_content_length,
      AVG(comment_count) AS avg_comment_count,
      ARRAY_AGG(tag_name) AS top_tags
    FROM (
      SELECT
        a.content,
        a.comment_count,
        a.deleted_at,
        at.tag_name
      FROM economic_discussion_articles a
      LEFT JOIN economic_discussion_article_tags aat ON a.id = aat.article_id
      LEFT JOIN economic_discussion_tags at ON aat.tag_id = at.id
      ORDER BY aat.sort_order NULLS LAST
      LIMIT 10
    ) AS subquery;
  `;
  const result: Array<{
    total_count: number;
    published_count: number;
    deleted_count: number;
    avg_content_length: number;
    avg_comment_count: number;
    top_tags: string[];
  }> = await MyGlobal.prisma.$queryRawUnsafe(sql);
  // Extract analytics from result
  const analytics = result[0];
  // Transform aggregated analytics into IEconomicDiscussionArticle structure
  return {
    id: v4() as string & tags.Format<"uuid">,
    title: "System-wide Article Analytics",
    posted_time: toISOStringSafe(new Date()) as
      | (string & tags.Format<"date-time">)
      | null,
    author: {
      id: v4() as string & tags.Format<"uuid">,
    },
    tags: analytics.top_tags.slice(0, 10).map((name: string) => ({
      name: name || null,
    })),
    comment_count: Math.round(analytics.avg_comment_count || 0) as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
  };
}
