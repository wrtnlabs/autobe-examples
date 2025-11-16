import { ITimePeriod } from "./ITimePeriod";
import { ISearchQueryFilters } from "./ISearchQueryFilters";
import { IPagination } from "./IPagination";

export namespace IEconomicDiscussionSearchAnalytics {
  /**
   * Request parameters for querying economic discussion search analytics and
   * performance metrics.
   *
   * This request schema provides filtering and configuration options for
   * moderators to analyze search functionality performance, query patterns,
   * and user engagement within the economic discussion platform. It supports
   * complex analytics queries with temporal, categorical, and behavioral
   * filtering capabilities.
   */
  export type IRequest = {
    /** Time range configuration for analytics data filtering. */
    time_period: ITimePeriod;

    /** Search query filtering criteria for targeted analysis. */
    query_filters?: ISearchQueryFilters | undefined;

    /**
     * Level of detail for analytics results: basic (summaries only),
     * detailed (with trends), comprehensive (full metrics with
     * breakdowns).
     */
    analysis_depth?: "basic" | "detailed" | "comprehensive" | undefined;

    /** Specific metrics to include in the analysis results. */
    metrics_focus?:
      | ("frequency" | "engagement" | "performance" | "categories")[]
      | undefined;

    /** Pagination configuration for large result sets. */
    pagination?: IPagination | undefined;
  };
}
