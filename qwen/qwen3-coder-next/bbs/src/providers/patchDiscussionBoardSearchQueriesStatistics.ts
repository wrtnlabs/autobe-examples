import { IDiscussionBoardSearchQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchQuery";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSearchQueriesStatistics(props: {
  body: IDiscussionBoardSearchQuery.IRequest;
}): Promise<IDiscussionBoardSearchQuery.IStatistic> {
  // Get total query statistics
  const queryStats =
    await MyGlobal.prisma.discussion_board_search_queries.aggregate({
      _count: {
        id: true,
      },
      _avg: {
        results_count: true,
      },
    });
  // Get click statistics with query context
  const clickStats =
    await MyGlobal.prisma.discussion_board_search_clicks.aggregate({
      _count: {
        id: true,
      },
      _avg: {
        result_position: true,
      },
    });
  // Get average relevance scores
  const relevanceStats =
    await MyGlobal.prisma.discussion_board_search_results.aggregate({
      _avg: {
        relevance_score: true,
      },
    });
  // Calculate click-through rate safely
  const totalQueries = queryStats._count.id ?? 0;
  const totalClicks = clickStats._count.id ?? 0;
  const clickThroughRate =
    totalQueries > 0 ? (totalClicks / totalQueries) * 100 : 0;
  // Get search term frequency (most popular queries)
  const popularQueries =
    await MyGlobal.prisma.discussion_board_search_queries.groupBy({
      by: ["search_query"],
      _count: {
        search_query: true,
      },
      orderBy: {
        _count: {
          search_query: "desc",
        },
      },
      take: 10,
    });
  // Get click position distribution
  const positionDistribution =
    await MyGlobal.prisma.discussion_board_search_clicks.groupBy({
      by: ["result_position"],
      _count: {
        result_position: true,
      },
      orderBy: {
        result_position: "asc",
      },
      take: 20,
    });
  // Convert position distribution to object for easier access
  const positionCounts: Record<number, number> = {};
  for (const item of positionDistribution) {
    positionCounts[item.result_position] = item._count.result_position;
  }
  return {
    total_queries: totalQueries,
    total_clicks: totalClicks,
    average_queries_per_session: totalQueries,
    average_clicks_per_query: clickThroughRate,
    average_relevance_score: relevanceStats._avg.relevance_score ?? 0,
    average_result_position: clickStats._avg.result_position ?? 0,
    top_queries: popularQueries.map((q) => ({
      query: q.search_query,
      count: q._count.search_query,
    })),
    position_distribution: positionCounts,
    most_clicked_positions: positionDistribution
      .sort((a, b) => b._count.result_position - a._count.result_position)
      .slice(0, 5)
      .map((p) => ({
        position: p.result_position,
        click_count: p._count.result_position,
      })),
  };
}
