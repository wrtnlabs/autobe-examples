import { IDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPerformanceMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPerformanceMetric";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminUsersStatistics(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardPerformanceMetric.IRequest;
}): Promise<IPageIDiscussionBoardPerformanceMetric.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions for user filtering
  const whereConditions: Prisma.discussion_board_usersWhereInput = {
    deleted_at: null,
    ...(props.body.registration_date_start && {
      created_at: { gte: props.body.registration_date_start },
    }),
    ...(props.body.registration_date_end && {
      created_at: { lte: props.body.registration_date_end },
    }),
  };
  // Get user statistics with aggregation using subqueries
  const usersWithStats = await MyGlobal.prisma.$queryRaw<
    Array<{
      id: string;
      email: string;
      display_name: string;
      created_at: string;
      article_count: number;
      comment_count: number;
      last_activity: string;
    }>
  >`
    SELECT 
      u.id,
      u.email,
      u.display_name,
      u.created_at,
      COALESCE(article_stats.article_count, 0) as article_count,
      COALESCE(comment_stats.comment_count, 0) as comment_count,
      GREATEST(
        u.created_at,
        COALESCE(article_stats.latest_article_date, u.created_at),
        COALESCE(comment_stats.latest_comment_date, u.created_at)
      ) as last_activity
    FROM discussion_board_users u
    LEFT JOIN (
      SELECT 
        discussion_board_user_id,
        COUNT(*) as article_count,
        MAX(created_at) as latest_article_date
      FROM discussion_board_articles 
      WHERE deleted_at IS NULL
      GROUP BY discussion_board_user_id
    ) article_stats ON u.id = article_stats.discussion_board_user_id
    LEFT JOIN (
      SELECT 
        discussion_board_user_id,
        COUNT(*) as comment_count,
        MAX(created_at) as latest_comment_date
      FROM discussion_board_comments 
      WHERE deleted_at IS NULL
      GROUP BY discussion_board_user_id
    ) comment_stats ON u.id = comment_stats.discussion_board_user_id
    WHERE u.deleted_at IS NULL
    AND (${props.body.registration_date_start ? Prisma.sql`u.created_at >= ${props.body.registration_date_start}` : Prisma.sql`1=1`})
    AND (${props.body.registration_date_end ? Prisma.sql`u.created_at <= ${props.body.registration_date_end}` : Prisma.sql`1=1`})
    AND (${props.body.min_articles ? Prisma.sql`COALESCE(article_stats.article_count, 0) >= ${props.body.min_articles}` : Prisma.sql`1=1`})
    AND (${props.body.min_comments ? Prisma.sql`COALESCE(comment_stats.comment_count, 0) >= ${props.body.min_comments}` : Prisma.sql`1=1`})
    ORDER BY 
      ${
        props.body.sort_by === "article_count"
          ? Prisma.sql`article_count`
          : props.body.sort_by === "comment_count"
            ? Prisma.sql`comment_count`
            : props.body.sort_by === "last_activity"
              ? Prisma.sql`last_activity`
              : Prisma.sql`u.created_at`
      } 
      ${props.body.sort_order === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`}
    LIMIT ${limit} OFFSET ${skip}
  `;
  // Get total count for pagination
  const totalResult = await MyGlobal.prisma.$queryRaw<
    Array<{
      total: bigint;
    }>
  >`
    SELECT COUNT(*) as total
    FROM discussion_board_users u
    LEFT JOIN (
      SELECT discussion_board_user_id, COUNT(*) as article_count
      FROM discussion_board_articles WHERE deleted_at IS NULL
      GROUP BY discussion_board_user_id
    ) article_stats ON u.id = article_stats.discussion_board_user_id
    LEFT JOIN (
      SELECT discussion_board_user_id, COUNT(*) as comment_count
      FROM discussion_board_comments WHERE deleted_at IS NULL
      GROUP BY discussion_board_user_id
    ) comment_stats ON u.id = comment_stats.discussion_board_user_id
    WHERE u.deleted_at IS NULL
    AND (${props.body.registration_date_start ? Prisma.sql`u.created_at >= ${props.body.registration_date_start}` : Prisma.sql`1=1`})
    AND (${props.body.registration_date_end ? Prisma.sql`u.created_at <= ${props.body.registration_date_end}` : Prisma.sql`1=1`})
    AND (${props.body.min_articles ? Prisma.sql`COALESCE(article_stats.article_count, 0) >= ${props.body.min_articles}` : Prisma.sql`1=1`})
    AND (${props.body.min_comments ? Prisma.sql`COALESCE(comment_stats.comment_count, 0) >= ${props.body.min_comments}` : Prisma.sql`1=1`})
  `;
  const total = Number(totalResult[0]?.total ?? 0);
  // Apply last activity filtering
  const filteredData = usersWithStats.filter((user) => {
    if (
      props.body.last_activity_start &&
      user.last_activity < props.body.last_activity_start
    )
      return false;
    if (
      props.body.last_activity_end &&
      user.last_activity > props.body.last_activity_end
    )
      return false;
    return true;
  });
  // Transform to DTO structure
  const data = filteredData.map((user) => ({
    user_id: user.id,
    email: user.email,
    display_name: user.display_name,
    registration_date: user.created_at,
    article_count: user.article_count,
    comment_count: user.article_count,
    last_activity: user.last_activity,
    account_age_days: Math.floor(
      (Date.now() - new Date(user.created_at).getTime()) /
        (1000 * 60 * 60 * 24),
    ),
  }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  };
}
