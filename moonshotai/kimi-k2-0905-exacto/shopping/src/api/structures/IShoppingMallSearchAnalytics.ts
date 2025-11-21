import { tags } from "typia";

import { IShoppingMallCustomerSession } from "./IShoppingMallCustomerSession";
import { IStringUuidSchema } from "./IStringUuidSchema";
import { IStringDateTimeSchema } from "./IStringDateTimeSchema";
import { IStringContentSchema } from "./IStringContentSchema";
import { IShoppingMallDeviceTypeEnum } from "./IShoppingMallDeviceTypeEnum";
import { IShoppingMallSearchTypeEnum } from "./IShoppingMallSearchTypeEnum";
import { IShoppingMallCustomer } from "./IShoppingMallCustomer";
import { IShoppingMallSeller } from "./IShoppingMallSeller";

export namespace IShoppingMallSearchAnalytics {
  /**
   * Summary representation of shopping mall search analytics optimized for
   * dashboard displays and high-volume analytics reporting. Provides
   * essential search performance metrics and success indicators while
   * including contextual customer and session information without the
   * computational overhead of complete relationship traversal.
   *
   * Contains core search engagement metrics including query text, result
   * counts, performance ratios, and success indicators along with customer
   * context for enhanced analytics interpretation. Enables rapid
   * identification of search performance patterns and customer engagement
   * trends while providing meaningful user context for dashboard analytics
   * and search experience optimization initiatives.
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
