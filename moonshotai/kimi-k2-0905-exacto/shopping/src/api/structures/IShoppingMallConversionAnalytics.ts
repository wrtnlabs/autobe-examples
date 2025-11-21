import { tags } from "typia";

import { IDateRange } from "./IDateRange";
import { IAnalyticsSorting } from "./IAnalyticsSorting";
import { IPerformanceThresholds } from "./IPerformanceThresholds";
import { IGeographicFilters } from "./IGeographicFilters";
import { IPagination } from "./IPagination";
import { IShoppingMallCustomerSession } from "./IShoppingMallCustomerSession";
import { IStringUuidSchema } from "./IStringUuidSchema";
import { IStringDateTimeSchema } from "./IStringDateTimeSchema";
import { IStringContentSchema } from "./IStringContentSchema";
import { IShoppingMallDeviceTypeEnum } from "./IShoppingMallDeviceTypeEnum";
import { IShoppingMallSearchTypeEnum } from "./IShoppingMallSearchTypeEnum";
import { IShoppingMallCustomer } from "./IShoppingMallCustomer";
import { IShoppingMallSeller } from "./IShoppingMallSeller";

export namespace IShoppingMallConversionAnalytics {
  /**
   * Advanced analytics request parameters for comprehensive seller
   * performance evaluation and marketplace business intelligence queries.
   *
   * This data structure enables sophisticated seller ecosystem analysis
   * through flexible parameter configuration including date range filtering,
   * performance threshold specifications, and multi-dimensional segmentation
   * capabilities. The request format supports both operational reporting
   * needs and strategic planning requirements while providing granular
   * control over analytical scope and data precision.
   *
   * Administrative teams use this comprehensive request interface to identify
   * seller development opportunities, assess marketplace quality initiatives,
   * and support data-driven strategic planning for seller relationship
   * management and marketplace ecosystem development programs. The parameter
   * structure enables both ad-hoc analysis and systematic performance
   * monitoring across different seller segments and operational categories.
   */
  export type IRequest = {
    /**
     * Temporal boundaries for seller analytics examination including start
     * and end dates for performance measurement periods. Enables flexible
     * analysis over different time frames including daily, weekly, monthly,
     * quarterly, or custom date ranges for seasonal analysis and
     * comparative performance evaluation across different business cycles.
     */
    dateRange?: IDateRange | undefined;

    /**
     * Performance-based sorting parameters controlling the arrangement of
     * seller analytics results based on specific performance metrics.
     * Enables prioritization of sellers by revenue generation, order
     * volume, customer satisfaction, registration recency, or growth rates
     * while supporting both ascending and descending sort orders for
     * comprehensive analytical flexibility.
     */
    sortingCriteria?: IAnalyticsSorting | undefined;

    /**
     * Quantitative filtering criteria specifying minimum performance
     * requirements for seller inclusion in analytics results. Enables
     * targeted analysis of high-performing sellers, growth segments, or
     * specific performance tiers while supporting strategic planning for
     * seller development programs and resource allocation optimization
     * across different seller segments.
     */
    performanceThresholds?: IPerformanceThresholds | undefined;

    /**
     * Location-based segmentation parameters restricting seller analytics
     * analysis to specific geographic regions, countries, or defined market
     * territories. Supports regional performance evaluation, market
     * expansion analysis, and geographic market development initiatives
     * while enabling comparative analysis across different territories and
     * customer demographics.
     */
    geographicFilters?: IGeographicFilters | undefined;

    /**
     * Result set navigation parameters controlling the quantity and
     * positioning of seller analytics information displayed in response
     * data. Enables efficient handling of large result sets through
     * controlled pagination while supporting both offset-based and
     * cursor-based navigation methods for optimal performance and user
     * experience in administrative analytics interfaces.
     */
    pagination: IPagination;
  };

  /**
   * Seller performance analytics summary providing comprehensive marketplace
   * activity and business success metrics.
   *
   * This summary aggregates seller-specific business intelligence including
   * revenue generation, order processing efficiency, customer reach, and
   * product performance across the marketplace platform. It enables
   * comparative analysis between sellers and supports strategic decision
   * making for marketplace optimization.
   *
   * Key performance indicators track both financial success and operational
   * efficiency while maintaining customer satisfaction metrics and return
   * rates for quality assessment. The data supports competitive evaluation
   * and helps identify successful seller practices for marketplace
   * improvement.
   *
   * Used in seller dashboards, marketplace performance reporting, and
   * business intelligence analysis to evaluate seller contribution to
   * platform success and identify opportunities for seller growth and
   * development.
   */
  export type ISummary = {
    /** Number of unique customers served */
    customer_count: number & tags.Type<"int32">;

    /**
     * Percentage of orders resulting in returns calculated from analytics
     * data
     */
    return_rate: number | null;

    /** Search result click-through percentage as engagement metric */
    click_through_rate?:
      | (number & tags.Minimum<0> & tags.Maximum<1>)
      | undefined;

    /** Product category with highest sales volume based on performance data */
    top_selling_category: string | null;

    /** Total number of orders processed */
    total_orders: number & tags.Type<"int32">;

    /**
     * Customer session context providing search session metadata for
     * analytics interpretation and user journey tracking
     */
    session: IShoppingMallCustomerSession.ISummary | null;

    /** Search conversion success rate highlighting commercial effectiveness */
    conversion_rate: number & tags.Minimum<0> & tags.Maximum<1>;

    /** Total individual product units sold */
    total_products_sold: number & tags.Type<"int32">;

    /** Unique identifier for the seller analytics summary */
    id: IStringUuidSchema;

    /** Record creation timestamp for analytics snapshot */
    created_at: IStringDateTimeSchema;

    /** Calculated average value per customer order */
    average_order_value: number;

    /** Core search query text for pattern identification and trend analysis */
    search_query: IStringContentSchema;

    /**
     * Search initiation timestamp for chronological plotting and trend
     * visualization
     */
    search_timestamp: IStringDateTimeSchema;

    /** Platform location identifier for contextual analysis */
    search_location: IStringContentSchema;

    /** Binary search success indicator for dashboard status display */
    search_successful: boolean;

    /** Total number of search results returned */
    search_result_count: number & tags.Type<"int32"> & tags.Minimum<0>;

    /** Number of search results user viewed or clicked */
    results_viewed: number & tags.Type<"int32"> & tags.Minimum<0>;

    /** Total gross revenue across all sales in marketplace currency */
    total_revenue: number;

    /** Device category summary for multi-platform analytics */
    device_type: IShoppingMallDeviceTypeEnum;

    /** Search session duration in seconds for engagement analysis */
    search_duration_seconds: number &
      tags.Type<"int32"> &
      tags.Minimum<0> &
      tags.Maximum<3600>;

    /** Search interface type categorization for dashboard filtering */
    search_type: IShoppingMallSearchTypeEnum;

    /**
     * Complete customer entity reference providing user context for search
     * analytics including customer demographics and shopping behavior
     * patterns
     */
    customer: IShoppingMallCustomer.ISummary | null;

    /**
     * Complete seller entity reference for analytics attribution including
     * business name and seller details
     */
    seller: IShoppingMallSeller.ISummary;
  };
}
