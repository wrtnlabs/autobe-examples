import { IRedditCommunityMaintenanceScheduleDateRange } from "./IRedditCommunityMaintenanceScheduleDateRange";
import { IRedditCommunityContentRankingAnalyticsFilter } from "./IRedditCommunityContentRankingAnalyticsFilter";
import { IRedditCommunityContentRankingAnalyticsAggregation } from "./IRedditCommunityContentRankingAnalyticsAggregation";
import { IRedditCommunityContentRankingAnalyticsGrouping } from "./IRedditCommunityContentRankingAnalyticsGrouping";
import { IRedditCommunityContentRankingAnalyticsMetrics } from "./IRedditCommunityContentRankingAnalyticsMetrics";
import { IRedditCommunityAnalyticsSorting } from "./IRedditCommunityAnalyticsSorting";
import { IPage } from "./IPage";

export namespace IRedditCommunityVisitorSessionUsage {
  /**
   * Advanced analytics request configuration for system usage analytics with
   * flexible filtering and aggregation capabilities. Supports complex
   * multi-dimensional analysis across user engagement metrics, content
   * performance indicators, and operational efficiency measurements for
   * comprehensive platform evaluation.
   */
  export type IRequest = {
    /**
     * Temporal analysis boundaries for time-based filtering and period
     * comparison
     */
    dateRange: IRedditCommunityMaintenanceScheduleDateRange;

    /** Multi-criteria filtering options for segmenting analytical data */
    filters?: IRedditCommunityContentRankingAnalyticsFilter[] | undefined;

    /**
     * Mathematical aggregation functions for quantitative analysis of
     * metrics
     */
    aggregations?:
      | IRedditCommunityContentRankingAnalyticsAggregation[]
      | undefined;

    /**
     * Data organization structure for comparative insights and dimensional
     * analysis
     */
    grouping?: IRedditCommunityContentRankingAnalyticsGrouping | undefined;

    /**
     * Performance indicators specification for comprehensive measurement
     * coverage
     */
    metrics: IRedditCommunityContentRankingAnalyticsMetrics;

    /** Result organization and ranking criteria for optimal presentation */
    sorting?: IRedditCommunityAnalyticsSorting | undefined;

    /**
     * Standard pagination configuration for API result management providing
     * consistent page-based navigation across analytical result sets and
     * large data collections
     */
    pagination?: IPage.IPagination | undefined;
  };
}
