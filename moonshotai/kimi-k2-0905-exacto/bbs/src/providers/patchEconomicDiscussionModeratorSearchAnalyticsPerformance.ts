import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionSearchAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSearchAnalytics";
import { ITimePeriod } from "@ORGANIZATION/PROJECT-api/lib/structures/ITimePeriod";
import { ISearchQueryFilters } from "@ORGANIZATION/PROJECT-api/lib/structures/ISearchQueryFilters";
import { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import { IPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/IPagination";
import { IPageIEconomicDiscussionSearchAnalyticsPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionSearchAnalyticsPerformance";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICrIPageIntegerRequired } from "@ORGANIZATION/PROJECT-api/lib/structures/ICrIPageIntegerRequired";
import { IEconomicDiscussionSearchAnalyticsPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSearchAnalyticsPerformance";
import { IEconomicDiscussionSearchQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSearchQuery";
import { ISearchMetricsByCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ISearchMetricsByCategory";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchEconomicDiscussionModeratorSearchAnalyticsPerformance(props: {
  moderator: ModeratorPayload;
  body: IEconomicDiscussionSearchAnalytics.IRequest;
}): Promise<IPageIEconomicDiscussionSearchAnalyticsPerformance> {
  const {
    time_period,
    query_filters,
    analysis_depth = "basic",
    metrics_focus = ["frequency"],
    pagination = { page: 1, limit: 20 },
  } = props.body;

  // Build time range filters using ISO date strings directly
  const startDate = time_period.start_date;
  const endDate = time_period.end_date;

  // Create date range for filtering (inclusive end date)
  const endDateTime = `${endDate}T23:59:59.999Z` as string &
    tags.Format<"date-time">;
  const startDateTime = `${startDate}T00:00:00.000Z` as string &
    tags.Format<"date-time">;

  // Base filter for search queries within time period
  const whereClause: Prisma.economic_discussion_search_queriesWhereInput = {
    last_used_at: {
      gte: new Date(startDateTime),
      lte: new Date(endDateTime),
    },
  };

  // Apply query text pattern filters
  if (
    query_filters?.query_patterns &&
    query_filters.query_patterns.length > 0
  ) {
    whereClause.query_text = {
      contains: query_filters.query_patterns[0],
    };
  }

  // Apply minimum frequency threshold
  if (query_filters?.min_frequency) {
    whereClause.frequency = {
      gte: query_filters.min_frequency,
    };
  }

  // Calculate pagination
  const page = pagination.page || 1;
  const limit = Math.min(pagination.limit || 20, 100); // Cap at 100 per page
  const skip = (page - 1) * limit;

  // Get search queries for current page with related metrics
  const searchQueries =
    await MyGlobal.prisma.economic_discussion_search_queries.findMany({
      where: whereClause,
      select: {
        id: true,
        query_text: true,
        frequency: true,
        results_count: true,
        average_click_position: true,
        last_used_at: true,
        created_at: true,
      },
      orderBy: [{ frequency: "desc" }, { last_used_at: "desc" }],
      skip,
      take: limit,
    });

  // Calculate aggregate metrics for the filtered dataset
  const aggregateMetrics =
    await MyGlobal.prisma.economic_discussion_search_queries.aggregate({
      where: whereClause,
      _sum: {
        frequency: true,
        results_count: true,
      },
      _count: true,
    });

  const totalSearches = aggregateMetrics._sum?.frequency || 0;
  const uniqueQueries = aggregateMetrics._count;
  const averageResultsPerQuery =
    uniqueQueries > 0
      ? (aggregateMetrics._sum?.results_count || 0) / uniqueQueries
      : 0;

  // Build analytics performance records for each search query
  const data: IEconomicDiscussionSearchAnalyticsPerformance[] =
    searchQueries.map((query, index) => ({
      totalSearches: query.frequency as number & tags.Type<"int32">,
      uniqueQueries: 1 as number & tags.Type<"int32">,
      averageResultsPerQuery: query.results_count || 0,
      topPerformingQueries: [
        {
          id: query.id as string & tags.Format<"uuid">,
          query_text: query.query_text,
          ranking_position: skip + index + 1,
          frequency: query.frequency as number & tags.Type<"int32">,
          engagement_score: query.average_click_position
            ? Math.max(0, 100 - query.average_click_position * 20)
            : 50,
        },
      ],
      poorPerformingQueries:
        query.frequency < 5
          ? [
              {
                id: query.id as string & tags.Format<"uuid">,
                query_text: query.query_text,
                ranking_position: skip + index + 1,
                frequency: query.frequency as number & tags.Type<"int32">,
                engagement_score: 10,
              },
            ]
          : [],
      searchMetricsByCategory: [], // Will need additional joins for real category data
    }));

  // For detailed/comprehensive analysis, add category breakdowns
  if (analysis_depth !== "basic" && query_filters?.categories) {
    // Category metrics would require joins with article and category tables
    // For now, we'll keep empty arrays for category metrics
  }

  // Get total count for pagination
  const totalRecords =
    await MyGlobal.prisma.economic_discussion_search_queries.count({
      where: whereClause,
    });

  const totalPages = Math.ceil(totalRecords / limit);

  return {
    pagination: {
      current: v4() as ICrIPageIntegerRequired,
      pages: totalPages.toString() as ICrIPageIntegerRequired,
      limit: limit.toString() as ICrIPageIntegerRequired,
      records: totalRecords.toString() as ICrIPageIntegerRequired,
    },
    data,
  };
}
