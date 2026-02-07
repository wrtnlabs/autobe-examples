import { IDiscussionBoardSearchMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardSearchMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSearchMetric";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSearchMetrics(props: {
  body: IDiscussionBoardSearchMetric.IRequest;
}): Promise<IPageIDiscussionBoardSearchMetric.ISummary> {
  // Fetch search queries with aggregated metrics
  const searchQueries =
    await MyGlobal.prisma.discussion_board_search_queries.findMany({
      select: {
        id: true,
        search_query: true,
        search_parameters: true,
        results_count: true,
        created_at: true,
      },
      orderBy: { created_at: "desc" },
    });
  // Fetch click statistics for each query
  const queryMetrics = await Promise.all(
    searchQueries.map(async (query) => {
      const clickCount =
        await MyGlobal.prisma.discussion_board_search_clicks.count({
          where: {
            search_query_id: query.id,
          },
        });
      const averagePosition =
        await MyGlobal.prisma.discussion_board_search_clicks.aggregate({
          _avg: {
            result_position: true,
          },
          where: {
            search_query_id: query.id,
          },
        });
      return {
        query: query.search_query,
        totalSearches: 1, // Each query record represents one search
        clickCount,
        averagePosition: averagePosition._avg.result_position || 0,
        resultsCount: query.results_count || 0,
        timestamp: toISOStringSafe(query.created_at),
      };
    }),
  );
  // Calculate overall metrics summary
  const totalSearches = queryMetrics.reduce(
    (sum, m) => sum + m.totalSearches,
    0,
  );
  const totalClicks = queryMetrics.reduce((sum, m) => sum + m.clickCount, 0);
  const avgClickRate =
    totalSearches > 0 ? (totalClicks / totalSearches) * 100 : 0;
  // Prepare summary data
  const data: IDiscussionBoardSearchMetric.ISummary[] = queryMetrics.map(
    (m) => ({
      query: m.query,
      totalSearches: m.totalSearches,
      clickCount: m.clickCount,
      clickRate: parseFloat(
        ((m.clickCount / m.totalSearches) * 100).toFixed(2),
      ),
      averagePosition: parseFloat(m.averagePosition.toFixed(2)),
      resultsCount: m.resultsCount,
      timestamp: m.timestamp,
    }),
  );
  // Pagination
  const page = 1;
  const limit = 100;
  const totalRecords = data.length;
  const totalPages = Math.ceil(totalRecords / limit);
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: totalRecords,
      pages: totalPages,
    },
  };
}
