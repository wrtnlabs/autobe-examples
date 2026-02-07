import { IDiscussionBoardSearchAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchAnalytic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardSearchAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSearchAnalytic";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSearchAnalytics(props: {
  body: IDiscussionBoardSearchAnalytic.IRequest;
}): Promise<IPageIDiscussionBoardSearchAnalytic.ISummary> {
  // Define pagination parameters with defaults
  const page = 1; // Default page
  const limit = 100; // Default limit
  const skip = (page - 1) * limit;
  // Query search analytics with pagination
  const data = await MyGlobal.prisma.$queryRaw`
    SELECT 
      sq.search_query,
      COUNT(DISTINCT sr.id) as result_count,
      COUNT(DISTINCT sc.id) as click_count,
      AVG(sr.relevance_score) as average_relevance_score,
      sq.results_count,
      sq.created_at
    FROM discussion_board_search_queries sq
    LEFT JOIN discussion_board_search_results sr ON sq.id = sr.search_query_id
    LEFT JOIN discussion_board_search_clicks sc ON sr.id = sc.search_result_id
    GROUP BY sq.id, sq.search_query, sq.results_count, sq.created_at
    ORDER BY sq.created_at DESC
    LIMIT ${limit} OFFSET ${skip};
  `;
  // Get total count for pagination
  const total = await MyGlobal.prisma.$queryRaw`
    SELECT COUNT(*) as count
    FROM discussion_board_search_queries sq;
  `;
  // Transform the raw query results into the required DTO format
  const transformedData: IDiscussionBoardSearchAnalytic.ISummary[] = (
    data as Array<{
      search_query: string;
      result_count: number;
      click_count: number;
      average_relevance_score: number | null;
      results_count: number | null;
      created_at: Date;
    }>
  ).map((record) => ({
    search_query: record.search_query,
    result_count: record.result_count,
    click_count: record.click_count,
    average_relevance_score: record.average_relevance_score ?? 0,
    results_count: record.results_count ?? null,
    created_at: toISOStringSafe(record.created_at),
  }));
  const totalCount =
    (
      total as Array<{
        count: number;
      }>
    )[0]?.count ?? 0;
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: totalCount,
      pages: totalCount > 0 ? Math.ceil(totalCount / limit) : 0,
    },
  };
}
