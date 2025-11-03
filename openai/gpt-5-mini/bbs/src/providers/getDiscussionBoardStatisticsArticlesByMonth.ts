import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticlesMonthlyStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticlesMonthlyStatistics";

export async function getDiscussionBoardStatisticsArticlesByMonth(): Promise<IDiscussionBoardArticlesMonthlyStatistics> {
  try {
    // Aggregate monthly buckets on DB side. We bucket rows by published_at when
    // available, otherwise by created_at (COALESCE), then compute conditional
    // counts per state. Soft-deleted rows (deleted_at IS NOT NULL) are excluded.
    const rows = (await MyGlobal.prisma.$queryRaw(Prisma.sql`
      SELECT
        date_trunc('month', COALESCE(published_at, created_at)) AS month,
        COUNT(*) FILTER (WHERE state = 'published' AND published_at IS NOT NULL
          AND published_at >= date_trunc('month', COALESCE(published_at, created_at))
          AND published_at < date_trunc('month', COALESCE(published_at, created_at)) + interval '1 month') AS published_count,
        COUNT(*) FILTER (WHERE state = 'draft' AND created_at >= date_trunc('month', COALESCE(published_at, created_at))
          AND created_at < date_trunc('month', COALESCE(published_at, created_at)) + interval '1 month') AS draft_count,
        COUNT(*) FILTER (WHERE state = 'pending_review' AND created_at >= date_trunc('month', COALESCE(published_at, created_at))
          AND created_at < date_trunc('month', COALESCE(published_at, created_at)) + interval '1 month') AS pending_review_count,
        COUNT(*) FILTER (WHERE state = 'hidden' AND created_at >= date_trunc('month', COALESCE(published_at, created_at))
          AND created_at < date_trunc('month', COALESCE(published_at, created_at)) + interval '1 month') AS hidden_count,
        COUNT(DISTINCT CASE WHEN state = 'published' AND published_at IS NOT NULL THEN discussion_board_member_id END) AS distinct_authors_published
      FROM discussion_board_articles
      WHERE deleted_at IS NULL
      GROUP BY date_trunc('month', COALESCE(published_at, created_at))
      ORDER BY date_trunc('month', COALESCE(published_at, created_at)) DESC
      LIMIT 1
    `)) as unknown as Array<Record<string, any>>;

    if (!rows || rows.length === 0) {
      return {
        month: "1970-01-01T00:00:00Z",
        published_count: 0,
        draft_count: 0,
        pending_review_count: 0,
        hidden_count: 0,
        distinct_authors_published: 0,
        average_published_per_author: 0,
      };
    }

    const row = rows[0] as Record<string, any>;

    const month = row.month
      ? toISOStringSafe(row.month as any)
      : "1970-01-01T00:00:00Z";

    const published_count = Number(row.published_count ?? 0);
    const draft_count = Number(row.draft_count ?? 0);
    const pending_review_count = Number(row.pending_review_count ?? 0);
    const hidden_count = Number(row.hidden_count ?? 0);
    const distinct_authors_published = Number(
      row.distinct_authors_published ?? 0,
    );

    const average_published_per_author =
      published_count / Math.max(distinct_authors_published, 1);

    return {
      month,
      published_count,
      draft_count,
      pending_review_count,
      hidden_count,
      distinct_authors_published,
      average_published_per_author,
    };
  } catch (err) {
    const correlationId = v4();
    throw new HttpException(`Database error (${correlationId})`, 500);
  }
}
